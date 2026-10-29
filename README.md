# Customer Segmentation Study

CodeNova Data Science Internship - Task 4

## Objective

Identify meaningful customer groups from purchasing behaviour and translate those groups into practical retention, growth, and service actions.

## Dataset note

No dataset was provided with the internship brief. This project therefore creates a deterministic, clearly labelled synthetic retail customer dataset. It is designed for a transparent, reproducible portfolio demonstration - not for making claims about real customers.

## What is included

- `run_segmentation.js` - creates the dataset, applies K-means clustering, and writes every output.
- `data/synthetic_customer_profiles.csv` - 900 synthetic customer profiles.
- `outputs/segmentation_summary.json` - reproducible segment metrics and recommendations.
- `segmentation_report.html` - a polished, presentation-ready report.

## Method

1. Generate customer-level behavioural features: recency, frequency, monetary value, average order value, discount affinity, and support contacts.
2. Standardize the clustering features.
3. Apply deterministic K-means with four clusters.
4. Profile each cluster and turn the results into practical actions.

## Run locally

```bash
node run_segmentation.js
```

Then open `segmentation_report.html` in a browser.

## Key safeguards

- The original synthetic profiles are preserved separately from the derived analysis.
- Cluster labels are descriptive interpretations, not ground truth.
- Segment actions should be tested with controlled campaigns before real deployment.

