import argparse
import json
import sys
import yaml
from uvicorn.importer import import_from_string

parser = argparse.ArgumentParser(prog="extract-openapi.py")
parser.add_argument("app", help='App import string. Eg. "main:app"')
parser.add_argument("--out", help="Output file ending in .json or .yaml", default="openapi.yaml")

if __name__ == "__main__":
    args = parser.parse_args()
    app = import_from_string(args.app)
    openapi_schema = app.openapi()
    
    with open(args.out, "w") as f:
        if args.out.endswith(".json"):
            json.dump(openapi_schema, f, indent=2)
        else:
            yaml.dump(openapi_schema, f, sort_keys=False)
    print(f"spec written to {args.out}")

