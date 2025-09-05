# queue-manager

Lightweight TERA proxy mod for tracking dungeon and battleground queue events with API synchronization.

## Features

- Event-driven queue tracking (dungeons & battlegrounds)
- Minimal performance impact with optimized HTTP calls
- Configurable API endpoint integration
- Raw packet hooks for maximum efficiency

## Installation

1. Download or clone this repository to your TERA proxy `mods` folder
2. Navigate to the mod directory: `cd mods/queue-manager`
3. Install dependencies: `npm install`
4. Configure your API settings in `config.json`
5. Restart your TERA proxy

## Configuration

Edit `config.json` to configure the mod:

```json
{
  "api_key": "your_api_key_here",
  "server_name": "Yurian",
  "api_matching_url": "https://tera.digitalsavior.fr/api/matching"
}
```

### Configuration Options

- **`api_key`**: Your API authentication key (required for API sync)
- **`server_name`**: Display name for your server
- **`api_matching_url`**: API endpoint for queue matching events

## How it Works

The mod automatically detects queue events when you're the party manager:

- **Queue Start**: Sends queue data when joining dungeon/BG matchmaking
- **Queue End**: Sends completion data when leaving matchmaking
- **Cleanup**: Properly handles mod shutdown and cleanup

## API Integration

Queue data is sent to the configured API endpoint with the following structure:

```json
{
  "players": 5,
  "instances": ["12345", "67890"],
  "server": "Yurian",
  "matching_state": 1
}
```

- `matching_state: 1` = Queue active
- `matching_state: 0` = Queue ended

## Performance

This mod is optimized for zero impact on game performance:

- Non-blocking HTTP requests using `setImmediate()`
- Connection pooling with 3-second timeouts
- Raw packet hooks to minimize parsing overhead
- Event-driven architecture (no background polling)

## Requirements

- TERA Proxy or TERA Toolbox
- Node.js with npm
- Valid API key for synchronization

## License

MIT
