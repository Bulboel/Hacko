import re
FT = re.compile(r"(\d+)[- ](?:foot|feet|ft\.?)(?![a-z])")
def m_(n):
    v = round(int(n) * 0.3, 1)
    return (f"{v:g}").replace(".", ",") + " m"
def split(text):
    ft = []
    def f(m): ft.append(m.group(1)); return "§"
    t = FT.sub(f, text)
    nums = []
    def g(m): nums.append(m.group(0)); return "#"
    t = re.sub(r"\d+", g, t)
    return t, ft, nums
def render(tpl, ft, nums):
    out = []; fi = ni = 0
    for ch in tpl:
        if ch == "§": out.append(m_(ft[fi]) if fi < len(ft) else "§"); fi += 1
        elif ch == "#": out.append(nums[ni] if ni < len(nums) else "#"); ni += 1
        else: out.append(ch)
    return "".join(out)
