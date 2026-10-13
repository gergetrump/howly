#!/usr/bin/env python3
"""Report whether this region's SES account has production access."""

import json
import subprocess
import sys


def main():
    query = json.load(sys.stdin)
    raw = subprocess.check_output(
        [
            "aws",
            "sesv2",
            "get-account",
            "--region",
            query["region"],
            "--output",
            "json",
            "--no-cli-pager",
        ],
        text=True,
    )
    account = json.loads(raw)
    enabled = bool(account.get("ProductionAccessEnabled"))
    details = account.get("Details") or {}
    review = details.get("ReviewDetails") or account.get("ReviewDetails") or {}
    json.dump({
        "production_access": "true" if enabled else "false",
        "review_status": review.get("Status") or "NONE",
    }, sys.stdout)


if __name__ == "__main__":
    main()
