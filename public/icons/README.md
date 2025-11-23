# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

## Required Icons

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (maskable)

## Shortcut Icons

- `shortcut-book.png` - 96x96 pixels (for "Book a Ride" shortcut)
- `shortcut-drive.png` - 96x96 pixels (for "Driver Mode" shortcut)

## Design Guidelines

### Primary Icon
- **Background**: Yellow gradient (#FFC107 to #FF9800)
- **Icon**: White taxi emoji 🚕 or TaxiCab logo
- **Style**: Rounded corners, modern flat design
- **Safe area**: Keep important elements within 80% of the icon area for maskable icons

### Color Scheme
- Primary: #FFC107 (Yellow)
- Accent: #FF6F00 (Orange)
- Text: #212121 (Dark Gray)
- Background: #FFFFFF (White)

## How to Generate Icons

### Option 1: Using Online Tools
1. Create a 512x512 base icon with the design above
2. Use https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
3. Upload your base icon and generate all sizes
4. Download and place in this directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run these commands from your base 512x512 icon:

convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

### Option 3: Using Figma/Sketch/Adobe XD
1. Create artboards for each size
2. Design the icon with the TaxiCab branding
3. Export each artboard as PNG
4. Place in this directory

## Temporary Placeholder

For development, you can use the taxi emoji as a temporary icon:
- Copy any existing icon from taxicab_landing or bmtoa_landing
- Or use a simple yellow square with a taxi emoji

## Testing

After adding icons, test the PWA installation:
1. Run `npm run build`
2. Run `npm run preview`
3. Open in Chrome/Edge
4. Click the install button in the address bar
5. Verify the icon appears correctly on your home screen

