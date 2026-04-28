This folder contains backend indexer tasks that listen for on-chain events and write derived data into Postgres.

Current scripts:
- `resultsPostedListener.ts`: consumes `OracleController.ResultsPosted` events and writes per-entry group scores to the `scores` table.

