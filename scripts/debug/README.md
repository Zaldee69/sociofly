# Debug Scripts

This folder contains various debugging and testing scripts for the scheduler application.

## Script Descriptions

### Testing Scripts

- `test-*.ts` - Various test scripts for different components
- `create-and-test-publish.ts` - Test script for publishing functionality

### Debugging Scripts

- `debug-*.ts` - Debugging utilities for various parts of the application
- `check-*.ts` - Health check and validation scripts

### Social Media Testing

- Scripts for testing Facebook and Instagram API integrations
- Account validation and token management scripts

## Usage

These scripts are primarily for development and debugging purposes. They should not be used in production environments.

To run a script, use:

```bash
npx tsx scripts/debug/[script-name].ts
```

## Note

These scripts may contain test data and should be reviewed before running in any environment connected to production services.
