# Codeworth

CLI tool to calculate traditional software valuation based on LOC (Lines of Code).

## Installation

```bash
npm install -g codeworth
```

## Usage

### Automatic Scan
Run in any project root to automatically count lines and value the project:

```bash
codeworth
```

### Manual Input
Provide a specific line count:

```bash
codeworth 26024
```

### Options

- `--rate <number>`: Override the default rate per line ($10.77).

### Examples

```bash
# Auto-scan current directory
codeworth

# Auto-scan with custom rate
codeworth --rate 25

# Manual input
codeworth 5000
```

## Output

```text
-----------------------------------
CodeWorth CLI
-----------------------------------
Lines of Code: 26,024
Rate Per Line: $10.77
Estimated Valuation: $280,000
-----------------------------------
```

## License

MIT
