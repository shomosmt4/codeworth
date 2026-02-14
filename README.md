# Codeworth

CLI tool to calculate traditional software valuation based on LOC (Lines of Code).

## Installation

```bash
npm install -g codeworth
```

## Usage

Run the tool with the total lines of code:

```bash
codeworth 26024
```

### Options

- `--rate <number>`: Override the default rate per line ($10.77).

### Examples

```bash
# Default valuation
codeworth 5000

# Custom rate
codeworth 5000 --rate 25
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
