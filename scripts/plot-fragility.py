#!/usr/bin/env python3
import pandas as pd
import matplotlib.pyplot as plt

# Load results
men_df = pd.read_csv("results/fragility_sweep.csv")
women_df = pd.read_csv("results/fragility_sweep-women.csv")

# Extract decay sweeps
men_decay = men_df[men_df["method"].str.startswith("decay_k")].copy()
women_decay = women_df[women_df["method"].str.startswith("decay_k")].copy()

men_decay["k"] = men_decay["method"].str.replace("decay_k=", "").astype(float)
women_decay["k"] = women_decay["method"].str.replace("decay_k=", "").astype(float)

# --- Plot Fragility Index ---
plt.figure(figsize=(8, 5))
plt.plot(men_decay["k"], men_decay["FI"], marker="o", label="Men (decay)")
plt.plot(women_decay["k"], women_decay["FI"], marker="s", label="Women (decay)")
plt.axhline(men_df[men_df["method"] == "official"]["FI"].values[0], color="red", linestyle="--", label="Men Official")
plt.axhline(women_df[women_df["method"] == "official"]["FI"].values[0], color="red", linestyle=":", label="Women Official")
plt.xlabel("Decay k")
plt.ylabel("Fragility Index (FI)")
plt.title("Fragility Index vs Decay k (Men vs Women)")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("results/fragility_index_vs_k_men_women.png", dpi=300)

# --- Plot Top-10 Ripple Effects ---
plt.figure(figsize=(8, 5))
plt.plot(men_decay["k"], men_decay["top10"], marker="o", label="Men (decay)")
plt.plot(women_decay["k"], women_decay["top10"], marker="s", label="Women (decay)")
plt.axhline(men_df[men_df["method"] == "official"]["top10"].values[0], color="red", linestyle="--", label="Men Official")
plt.axhline(women_df[women_df["method"] == "official"]["top10"].values[0], color="red", linestyle=":", label="Women Official")
plt.xlabel("Decay k")
plt.ylabel("Top-10 Ripple Effects")
plt.title("Top-10 Ripple Effects vs Decay k (Men vs Women)")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("results/top10_ripples_vs_k_men_women.png", dpi=300)

print("✅ Plots saved in results/: fragility_index_vs_k_men_women.png and top10_ripples_vs_k_men_women.png")

