#!/usr/bin/env python3
# HSC LINE 分享收尾（2026-08-15）：列出目前所有「正式、非測試、非停用/草稿/刪除」的卡號，
# 寫進 valid_card_ids.txt（每行一個卡號），給 update-card-cache.yml 逐張抓 cache／產生
# share page 用。
#
# 呼叫既有的 getCards（admin-protected，本來就支援分頁/狀態篩選，card_db 這張表本來就是
# source of truth）——不新增任何新的 GAS action。篩選條件跟 getCardPublicShell_ 既有的
# 公開讀取判斷完全一致（同一份 exclusion list inactive/draft/deleted），不是另外發明一套
# 「有效卡」定義；is_test=TRUE 的測試卡也排除，只留正式卡。
#
# 用法：HSC_ADMIN_KEY=xxx python3 scripts/list-valid-cards.py [輸出檔路徑，預設 valid_card_ids.txt]
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "https://angel-namecard.letssyncus.com/gas-proxy/exec"
EXCLUDED_STATUS = {"inactive", "draft", "deleted"}


def fetch_all_card_ids(admin_key):
    card_ids = set()
    offset = 0
    limit = 500
    while True:
        params = urllib.parse.urlencode({
            "action": "getCards",
            "admin_key": admin_key,
            "limit": limit,
            "offset": offset,
        })
        with urllib.request.urlopen(BASE + "?" + params, timeout=30) as resp:
            data = json.load(resp)
        if not data.get("ok"):
            print("::error::getCards 失敗：" + json.dumps(data)[:300])
            sys.exit(1)
        cards = data.get("cards", [])
        for c in cards:
            cid = str(c.get("id") or c.get("card_id") or "").strip()
            status = str(c.get("status") or "").strip().lower()
            is_test = str(c.get("is_test") or "").strip().upper() == "TRUE"
            if not cid or is_test or status in EXCLUDED_STATUS:
                continue
            card_ids.add(cid)
        if len(cards) < limit:
            break
        offset += limit
    return card_ids


def main():
    admin_key = os.environ.get("HSC_ADMIN_KEY", "")
    if not admin_key:
        print("::error::缺少環境變數 HSC_ADMIN_KEY")
        sys.exit(1)
    out_path = sys.argv[1] if len(sys.argv) > 1 else "valid_card_ids.txt"

    card_ids = fetch_all_card_ids(admin_key)

    with open(out_path, "w") as f:
        f.write("\n".join(sorted(card_ids)))
    print("有效正式卡數量：" + str(len(card_ids)))


if __name__ == "__main__":
    main()
