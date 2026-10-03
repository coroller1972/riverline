"""python -m solver spot.json > result.json (pure Python, no database or broker)."""

import argparse
import json
import sys

from solver import SolveConfig, solve

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("config", help="JSON matching the standalone SolveConfig fields")
args = parser.parse_args()
try:
    with open(args.config) as stream:
        config = SolveConfig(**json.load(stream))
    result = solve(
        config, progress=lambda p: print(f"{p['iteration']}/{p['max_iterations']}", file=sys.stderr)
    )
    print(json.dumps(result.to_dict(), allow_nan=False))
except (ValueError, TypeError) as exc:
    parser.error(str(exc))
