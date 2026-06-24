import fitz, json, re, sys
sys.stdout.reconfigure(encoding="utf-8")

doc = fitz.open(r"C:\Jimin\gianssi\out\real.pdf")
pages = [re.sub(r"\s+", "", doc[i].get_text()) for i in range(len(doc))]

def find(coretext):
    for i in range(1, len(pages)):  # 목차(0p) 제외
        if coretext and coretext in pages[i]:
            return i + 1
    return None

def core(text):
    t = re.sub(r"<[^>]+>", "", text)                   # HTML 태그(<br> 등) 제거
    t = re.sub(r"\*\*|`", "", t)                        # md 강조 제거
    t = re.sub(r"\s+", "", t)                            # 공백 제거
    t = re.sub(r"^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\d.\-)]+", "", t)        # 선행 마커 제거
    return t

res = {}
secIdx = 0
subIdx = 0
for line in open(r"C:\Jimin\gianssi\fixtures\real.md", encoding="utf-8"):
    s = line.strip()
    if s.startswith("####"):
        continue
    m3 = re.match(r"^###\s+(.*)", s)
    m2 = re.match(r"^##\s+(.*)", s)
    if m3:
        p = find(core(m3.group(1)))
        if p:
            res[f"sec{secIdx}_{subIdx}"] = p
        subIdx += 1
    elif m2:
        secIdx += 1
        subIdx = 0
        p = find(core(m2.group(1)))
        if p:
            res[f"sec{secIdx}"] = p

json.dump(res, open(r"C:\Jimin\gianssi\out\pagenums.json", "w", encoding="utf-8"), ensure_ascii=False)
print(res)
