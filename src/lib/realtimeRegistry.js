/**
 * Supabase Realtime Registry (deduped + ref-counted)
 *
 * Goal: prevent duplicate subscriptions and re-subscribe loops caused by unstable
 * callbacks in React dependency arrays.
 *
 * Design:
 * - One underlying Supabase channel per `channelName`
 * - For each (schema, table, event, filter) "topic", we attach exactly one Supabase
 *   handler and fan out to a Set of JS listeners.
 * - Unsubscribe is cheap: we remove the JS listener from the Set. If no listeners
 *   remain for *any* topic on a channel, we unsubscribe and delete the channel.
 */

import { supabase } from './supabase';

const channels = new Map();

function getOrCreateEntry(channelName) {
  let entry = channels.get(channelName);
  if (entry) return entry;

  entry = {
    channelName,
    channel: supabase.channel(channelName),
    subscribed: false,
    topics: new Map(), // topicKey -> { listeners:Set<fn>, handler: fn }
    statusListeners: new Set(), // Set<(status)=>void>
  };

  channels.set(channelName, entry);
  return entry;
}

function ensureSubscribed(entry) {
  if (entry.subscribed) return;
  entry.subscribed = true;
  entry.channel.subscribe((status) => {
    entry.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        // ignore listener errors
      }
    });
  });
}

function getTopicKey({ schema, table, event, filter }) {
  return `${schema}:${table}:${event}:${filter || ''}`;
}

export function subscribePostgresChanges({
  channelName,
  schema = 'public',
  table,
  event = '*',
  filter,
  listener,
}) {
  if (!channelName) throw new Error('subscribePostgresChanges: channelName is required');
  if (!table) throw new Error('subscribePostgresChanges: table is required');
  if (typeof listener !== 'function') throw new Error('subscribePostgresChanges: listener must be a function');

  const entry = getOrCreateEntry(channelName);
  ensureSubscribed(entry);

  const topicKey = getTopicKey({ schema, table, event, filter });
  let topic = entry.topics.get(topicKey);

  if (!topic) {
    const listeners = new Set();
    const handler = (payload) => {
      // Fan out to current listeners (stable, detachable)
      listeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          // ignore listener errors
        }
      });
    };

    topic = { listeners, handler };
    entry.topics.set(topicKey, topic);

    entry.channel.on(
      'postgres_changes',
      {
        schema,
        table,
        event,
        ...(filter ? { filter } : {}),
      },
      handler
    );
  }

  topic.listeners.add(listener);

  // Return unsubscribe
  return () => {
    const currentEntry = channels.get(channelName);
    if (!currentEntry) return;
    const currentTopic = currentEntry.topics.get(topicKey);
    if (!currentTopic) return;

    currentTopic.listeners.delete(listener);

    // If no listeners remain for this topic, we keep the Supabase handler attached,
    // but it becomes a cheap no-op fanout. Full cleanup happens when the entire
    // channel has no active listeners across all topics.
    const hasAnyListeners = Array.from(currentEntry.topics.values()).some(
      (t) => t.listeners.size > 0
    );

    if (!hasAnyListeners && currentEntry.statusListeners.size === 0) {
      try {
        currentEntry.channel.unsubscribe();
      } finally {
        channels.delete(channelName);
      }
    }
  };
}

export function subscribeChannelStatus(channelName, listener) {
  if (!channelName) throw new Error('subscribeChannelStatus: channelName is required');
  if (typeof listener !== 'function') throw new Error('subscribeChannelStatus: listener must be a function');

  const entry = getOrCreateEntry(channelName);
  ensureSubscribed(entry);

  entry.statusListeners.add(listener);

  return () => {
    const currentEntry = channels.get(channelName);
    if (!currentEntry) return;
    currentEntry.statusListeners.delete(listener);

    const hasAnyListeners = Array.from(currentEntry.topics.values()).some(
      (t) => t.listeners.size > 0
    );
    if (!hasAnyListeners && currentEntry.statusListeners.size === 0) {
      try {
        currentEntry.channel.unsubscribe();
      } finally {
        channels.delete(channelName);
      }
    }
  };
}


