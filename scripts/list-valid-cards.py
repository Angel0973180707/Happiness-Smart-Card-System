#!/usr/bin/env python3
# HSC LINE 分享收尾（2026-08-15）：列出目前所有「正式、非測試、非停用/草稿/刪除」的卡號，
# 寫進 valid_card_ids.txt（每行一個卡號，含結尾換行），給 update-card-cache.yml 逐張抓
# cache／產生 share page 用。
#
# 呼叫既有的 getCards（admin-protected，本來就支援分頁/狀態篩選，card_db 這張表本來就是
# source of truth）——不新增任何新的 GAS action。篩選條件跟 getCardPublicShell_ 既有的
# 公開讀取判斷完全一致（同一份 exclusion list inactive/draft/deleted），不是另外發明一套
# 「有效卡」定義；is_test=TRUE 的測試卡也排除。
#
# 技術長複審修正（2026-08-15）：is_test 這個欄位在 card_db 裡沒有被完整地維護——
# TAGENT_BRONZE／TAGENT_SILVER／TAGENT_GOLD／TAGENT_CUST 這四張 CLAUDE.md「十四、測試
# 工具（永久保留）」明確記載的分潤測試代理卡，is_test 欄位是空字串，不是 "TRUE"，光靠
# is_test 篩不掉。額外要求卡號必須符合 TW+數字（例如 TW0001）這個正式卡片建立
# （generateCardId_）本來就在用的號碼格式，才會被當成「正式卡」——這不是另外發明一套
# 規則，是本來產生正式卡號的規則本身，用來補 is_test 資料不齊全的洞，兩層篩選都過才收。
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BASE = "https://angel-namecard.letssyncus.com/gas-proxy/exec"
EXCLUDED_STATUS = {"inactive", "draft", "deleted"}
PRODUCTION_CARD_ID_RE = re.compile(r"^TW\d+$")


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
            if not PRODUCTION_CARD_ID_RE.match(cid):
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

    # 結尾一定要有換行：update-card-cache.yml 用 `while IFS= read -r CARD_ID; do ... done
    # < valid_card_ids.txt` 逐行讀取，這種寫法在檔案最後一行沒有換行符號時，bash 的
    # read 會直接跳過那一行（不會進迴圈本體）——上一輪就是這樣漏掉了排序最後一張正式卡。
    with open(out_path, "w") as f:
        for cid in sorted(card_ids):
            f.write(cid + "\n")
    print("有效正式卡數量：" + str(len(card_ids)))


if __name__ == "__main__":
    main()
