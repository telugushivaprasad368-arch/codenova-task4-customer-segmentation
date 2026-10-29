# Cluster selection evidence

The model was evaluated across `k = 2` to `k = 6` using standardized Recency, Frequency, Monetary, average order value, discount affinity, and support-contact features.

| k | Relative within-cluster variation | Silhouette interpretation |
| --- | --- | --- |
| 2 | High | Broad split; hides meaningful engagement differences |
| 3 | Moderate | Improves separation, but blends value-oriented and reactivation behaviour |
| 4 | Clear elbow | Strong, interpretable separation with four action-ready personas |
| 5 | Small incremental gain | Adds complexity without a distinct operational use case |
| 6 | Small incremental gain | Over-segmentation risk |

`k = 4` was selected because it balances compact clusters, separation, and business interpretability. This is a portfolio demonstration using synthetic data; a production model should recalculate these metrics on current customer data and validate campaign uplift experimentally.

