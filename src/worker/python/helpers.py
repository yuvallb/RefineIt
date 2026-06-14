import json

import numpy as np
import pandas as pd

MAX_PROFILE_ROWS = 100_000


def preview_df(df, n=100):
    if df is None or len(df.columns) == 0:
        return {
            "columns": [],
            "rows": [],
            "totalRows": len(df) if df is not None else 0,
            "totalColumns": 0,
        }

    return {
        "columns": [
            {
                "name": col,
                "dtype": str(df[col].dtype),
                "nullable": bool(df[col].isna().any()),
            }
            for col in df.columns
        ],
        "rows": json.loads(df.head(n).to_json(orient="records", date_format="iso")),
        "totalRows": len(df),
        "totalColumns": len(df.columns),
    }


def compute_histogram(series, bins=10):
    clean = series.dropna()
    if len(clean) == 0:
        return []

    counts, edges = np.histogram(clean, bins=bins)
    return [
        {
            "bin_start": float(edges[i]),
            "bin_end": float(edges[i + 1]),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]


def profile_df(df):
    profile_source = df
    if len(df) > MAX_PROFILE_ROWS:
        profile_source = df.sample(n=MAX_PROFILE_ROWS, random_state=42)

    profiles = []
    for col in profile_source.columns:
        series = profile_source[col]
        is_empty = len(series) == 0 or series.isna().all()

        profile = {
            "name": col,
            "dtype": str(series.dtype),
            "nullCount": int(series.isna().sum()) if not is_empty else len(series),
            "nullPct": float(series.isna().mean()) if len(series) > 0 else 0.0,
            "uniqueCount": int(series.nunique()) if not is_empty else 0,
        }

        if pd.api.types.is_numeric_dtype(series):
            profile["min"] = float(series.min()) if not is_empty else None
            profile["max"] = float(series.max()) if not is_empty else None
            profile["mean"] = float(series.mean()) if not is_empty else None
            profile["histogram"] = compute_histogram(series) if not is_empty else []
        elif pd.api.types.is_string_dtype(series) or series.dtype == "object":
            profile["topValues"] = (
                series.value_counts().head(10).to_dict() if not is_empty else {}
            )
        elif pd.api.types.is_datetime64_any_dtype(series):
            profile["min"] = series.min().isoformat() if not is_empty else None
            profile["max"] = series.max().isoformat() if not is_empty else None

        profiles.append(profile)

    return profiles
