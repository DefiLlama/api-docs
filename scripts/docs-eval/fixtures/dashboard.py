import os
import time
import requests

API_KEY = os.environ.get("DEFILLAMA_API_KEY")


def get_top_protocols(n=5):
    protocols = requests.get("https://api.llama.fi/protocols").json()
    protocols.sort(key=lambda p: p.get("tvl") or 0, reverse=True)
    return [(p["name"], p["tvl"]) for p in protocols[:n]]


def get_prices():
    r = requests.get("https://coins.llama.fi/prices/current/coingecko:ethereum,coingecko:bitcoin")
    r.raise_for_status()
    return {k: v["price"] for k, v in r.json()["coins"].items()}


def get_stablecoin_total():
    data = requests.get("https://stablecoins.llama.fi/stablecoins").json()
    return sum(s["circulating"].get("peggedUSD", 0) for s in data["peggedAssets"])


if __name__ == "__main__":
    for i in range(3):
        print(get_top_protocols())
        print(get_prices())
        print(get_stablecoin_total())
        time.sleep(1)
