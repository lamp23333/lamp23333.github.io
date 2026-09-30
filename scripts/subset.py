#!/usr/bin/env python3
"""
字体子集化脚本
-------------
1. 扫描网站所有 .html / .js 文件，提取实际用到的字符
2. 用这些字符裁剪 fonts-source/ 下的字体
3. 输出到 fonts/（体积可减少 95% 以上）

本地预览也可以跑：python scripts/subset.py
"""
from pathlib import Path
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-source"
OUT = ROOT / "fonts"

# 兜底字符：即使正文没用到，也保留基础符号，避免以后加内容缺字
FALLBACK = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " .,!?;:'\"()[]{}<>/\\|`~@#$%^&*_+-=、。，！？；：'""''（）【】《》…—～·"
)


def collect_chars() -> set:
    chars = set(FALLBACK)
    for pattern in ("*.html", "*.js", "*.css"):
        for p in ROOT.glob(pattern):
            chars.update(p.read_text(encoding="utf-8"))
    return chars


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"找不到源字体目录：{SRC}")

    OUT.mkdir(exist_ok=True)
    chars = collect_chars()
    text_file = ROOT / ".subset-chars.txt"
    text_file.write_text("".join(sorted(chars)), encoding="utf-8")

    print(f"[subset] 共收集 {len(chars)} 个字符")

    fonts = sorted(SRC.glob("*.woff2"))
    if not fonts:
        raise SystemExit(f"{SRC} 里没有 .woff2 字体文件")

    for src in fonts:
        out = OUT / src.name
        subset.main(
            [
                str(src),
                f"--text-file={text_file}",
                "--flavor=woff2",
                f"--output-file={out}",
                "--layout-features=*",
            ]
        )
        before = src.stat().st_size / 1024
        after = out.stat().st_size / 1024
        print(f"[subset] {src.name}: {before:.0f} KB -> {after:.1f} KB")

    text_file.unlink(missing_ok=True)
    print("[subset] 完成")


if __name__ == "__main__":
    main()
