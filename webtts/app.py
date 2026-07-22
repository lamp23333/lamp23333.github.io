#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EdgeTTS Web Application - Free Microsoft TTS"""

import io, json, os, re, shutil, tempfile, asyncio, base64
from xml.sax.saxutils import escape as xml_escape
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file

app = Flask(__name__, template_folder='/sdcard/document/webtts/templates')

VOICES_DATA = {
    "zh-CN-XiaoxiaoNeural": {"name": "Xiaoxiao (F)", "lang": "zh-CN", "gender": "Female",
        "category": "News, Novel", "personality": "Warm",
        "styles": ["general","assistant","chat","customerservice","newscast-formal","newscast-casual",
            "affectionate","angry","calm","cheerful","depressed","disgruntled","embarrassed",
            "empathetic","envious","excited","fearful","gentle","lyrical","poetry-reading",
            "sad","serious","shouting","sports_commentary","sports_commentary_excited",
            "terrified","unfriendly","whispering"]},
    "zh-CN-YunxiNeural": {"name": "Yunxi (M)", "lang": "zh-CN", "gender": "Male",
        "category": "Novel", "personality": "Lively",
        "styles": ["general","assistant","chat","cheerful","sad","angry","excited",
            "fearful","depressed","serious","friendly","terrified","whispering","embarrassed"]},
    "zh-CN-YunjianNeural": {"name": "Yunjian (M)", "lang": "zh-CN", "gender": "Male",
        "category": "Sports, Novel", "personality": "Passion",
        "styles": ["general","assistant","chat","cheerful","sad","angry","excited",
            "fearful","depressed","serious","friendly","terrified","whispering","embarrassed"]},
    "zh-CN-YunyangNeural": {"name": "Yunyang (M)", "lang": "zh-CN", "gender": "Male",
        "category": "News", "personality": "Professional",
        "styles": ["general","customerservice","narration-professional","newscast-casual"]},
    "zh-CN-YunxiaNeural": {"name": "Yunxia (M)", "lang": "zh-CN", "gender": "Male",
        "category": "Cartoon, Novel", "personality": "Cute",
        "styles": ["general","assistant","chat","cheerful","sad","angry","excited",
            "fearful","depressed","serious","friendly","terrified","whispering","embarrassed"]},
    "zh-CN-XiaoyiNeural": {"name": "Xiaoyi (F)", "lang": "zh-CN", "gender": "Female",
        "category": "Cartoon, Novel", "personality": "Lively",
        "styles": ["general","assistant","chat","cheerful","sad","angry","excited",
            "fearful","depressed","serious","friendly","terrified","whispering","embarrassed"]},
    "zh-CN-liaoning-XiaobeiNeural": {"name": "Xiaobei-Liaoning (F)", "lang": "zh-CN",
        "gender": "Female", "category": "Dialect", "personality": "Humorous", "styles": ["general"]},
    "zh-CN-shaanxi-XiaoniNeural": {"name": "Xiaoni-Shaanxi (F)", "lang": "zh-CN",
        "gender": "Female", "category": "Dialect", "personality": "Bright", "styles": ["general"]},
    "zh-HK-HiuGaaiNeural": {"name": "HiuGaai-Cantonese (F)", "lang": "zh-HK",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "zh-HK-HiuMaanNeural": {"name": "HiuMaan-Cantonese (F)", "lang": "zh-HK",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "zh-HK-WanLungNeural": {"name": "WanLung-Cantonese (M)", "lang": "zh-HK",
        "gender": "Male", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "zh-TW-HsiaoChenNeural": {"name": "HsiaoChen-Taiwan (F)", "lang": "zh-TW",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "zh-TW-YunJheNeural": {"name": "YunJhe-Taiwan (M)", "lang": "zh-TW",
        "gender": "Male", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "en-US-AriaNeural": {"name": "Aria (US-F)", "lang": "en-US", "gender": "Female",
        "category": "News, Novel", "personality": "Positive",
        "styles": ["general","chat","cheerful","customerservice","empathetic","excited",
            "friendly","hopeful","narration-professional","newscast-formal","newscast-casual",
            "sad","shouting","terrified","unfriendly","whispering"]},
    "en-US-GuyNeural": {"name": "Guy (US-M)", "lang": "en-US", "gender": "Male",
        "category": "News, Novel", "personality": "Passion",
        "styles": ["general","chat","cheerful","customerservice","empathetic","excited",
            "friendly","hopeful","narration-professional","newscast-formal","newscast-casual",
            "sad","shouting","terrified","unfriendly","whispering"]},
    "en-US-JennyNeural": {"name": "Jenny (US-F)", "lang": "en-US", "gender": "Female",
        "category": "General", "personality": "Friendly",
        "styles": ["general","assistant","chat","customerservice","newscast","angry",
            "cheerful","sad","excited","friendly","terrified","shouting","unfriendly",
            "whispering","hopeful"]},
    "en-US-AnaNeural": {"name": "Ana-Child (US-F)", "lang": "en-US",
        "gender": "Female", "category": "Cartoon", "personality": "Cute", "styles": ["general"]},
    "en-US-ChristopherNeural": {"name": "Christopher (US-M)", "lang": "en-US",
        "gender": "Male", "category": "News", "personality": "Reliable", "styles": ["general"]},
    "en-US-EricNeural": {"name": "Eric (US-M)", "lang": "en-US",
        "gender": "Male", "category": "News", "personality": "Rational", "styles": ["general"]},
    "en-US-MichelleNeural": {"name": "Michelle (US-F)", "lang": "en-US",
        "gender": "Female", "category": "News", "personality": "Pleasant", "styles": ["general"]},
    "en-US-RogerNeural": {"name": "Roger (US-M)", "lang": "en-US",
        "gender": "Male", "category": "News", "personality": "Lively", "styles": ["general"]},
    "en-GB-SoniaNeural": {"name": "Sonia (UK-F)", "lang": "en-GB",
        "gender": "Female", "category": "General", "personality": "Friendly",
        "styles": ["general","cheerful","sad"]},
    "en-GB-RyanNeural": {"name": "Ryan (UK-M)", "lang": "en-GB",
        "gender": "Male", "category": "General", "personality": "Friendly",
        "styles": ["general","cheerful","sad"]},
    "en-GB-LibbyNeural": {"name": "Libby (UK-F)", "lang": "en-GB",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "en-GB-ThomasNeural": {"name": "Thomas (UK-M)", "lang": "en-GB",
        "gender": "Male", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "en-AU-NatashaNeural": {"name": "Natasha (AU-F)", "lang": "en-AU",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "ja-JP-NanamiNeural": {"name": "Nanami (JP-F)", "lang": "ja-JP",
        "gender": "Female", "category": "General", "personality": "Friendly",
        "styles": ["general","chat","cheerful","customerservice"]},
    "ja-JP-KeitaNeural": {"name": "Keita (JP-M)", "lang": "ja-JP",
        "gender": "Male", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "ko-KR-SunHiNeural": {"name": "SunHi (KR-F)", "lang": "ko-KR",
        "gender": "Female", "category": "General", "personality": "Friendly", "styles": ["general"]},
    "ko-KR-InJoonNeural": {"name": "InJoon (KR-M)", "lang": "ko-KR",
        "gender": "Male", "category": "General", "personality": "Friendly", "styles": ["general"]},
}

STYLE_LABELS = {
    "general": "General", "assistant": "Assistant", "chat": "Chat",
    "customerservice": "Customer Service", "newscast-formal": "News Formal",
    "newscast-casual": "News Casual", "newscast": "News",
    "narration-professional": "Pro Narration", "affectionate": "Affectionate",
    "angry": "Angry", "calm": "Calm", "cheerful": "Cheerful",
    "depressed": "Depressed", "disgruntled": "Disgruntled",
    "embarrassed": "Embarrassed", "empathetic": "Empathetic",
    "envious": "Envious", "excited": "Excited", "fearful": "Fearful",
    "friendly": "Friendly", "gentle": "Gentle", "hopeful": "Hopeful",
    "lyrical": "Lyrical", "poetry-reading": "Poetry Reading",
    "sad": "Sad", "serious": "Serious", "shouting": "Shouting",
    "sports_commentary": "Sports Commentary",
    "sports_commentary_excited": "Sports Excited",
    "terrified": "Terrified", "unfriendly": "Unfriendly", "whispering": "Whispering",
}

def build_ssml(text, voice, rate="0%", pitch="0Hz", volume="100%",
               style="general", style_degree="100", silence_ms=0):
    text = xml_escape(text)
    if silence_ms > 0:
        silence_tag = f'<break time="{silence_ms}ms"/>'
        text = re.sub(r'([。！？!?\n])', rf'\1{silence_tag}', text)

    styles_available = VOICES_DATA.get(voice, {}).get("styles", ["general"])
    has_styles = len(styles_available) > 1 or styles_available[0] != "general"
    prosody = f'<prosody rate="{rate}" pitch="{pitch}" volume="{volume}">'

    if has_styles and style != "general":
        express_as = f'<mstts:express-as style="{style}" styledegree="{style_degree}">'
        ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
                f'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">'
                f'<voice name="{voice}">{express_as}{prosody}{text}'
                f'</prosody></mstts:express-as></voice></speak>')
    else:
        ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
                f'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">'
                f'<voice name="{voice}">{prosody}{text}</prosody></voice></speak>')
    return ssml

async def generate_tts_async(text, voice, rate, pitch, volume,
                              style, style_degree, silence_ms, output_path):
    ssml = build_ssml(text, voice, rate, pitch, volume, style, style_degree, silence_ms)

    possible_paths = [
        Path("/home/webtts/venv/bin/edge-tts"),
        Path(__file__).parent / "venv" / "bin" / "edge-tts",
    ]
    edge_tts_bin = None
    for p in possible_paths:
        if p.exists():
            edge_tts_bin = p
            break
    if edge_tts_bin is None:
        found = shutil.which("edge-tts")
        edge_tts_bin = found if found else "edge-tts"

    cmd = [str(edge_tts_bin), "--voice", voice, "--write-media", output_path, "--text", ssml]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err_msg = stderr.decode() if stderr else "Unknown error"
        raise RuntimeError(f"TTS generation failed: {err_msg}")
    return output_path

def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/voices")
def get_voices():
    return jsonify(VOICES_DATA)

@app.route("/api/style-labels")
def get_style_labels():
    return jsonify(STYLE_LABELS)

@app.route("/api/tts", methods=["POST"])
def tts_generate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request data empty"}), 400
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Text is empty"}), 400
    if len(text) > 5000:
        return jsonify({"error": "Text too long (max 5000)"}), 400

    voice = data.get("voice", "zh-CN-XiaoxiaoNeural")
    rate = data.get("rate", "0%")
    pitch = data.get("pitch", "0Hz")
    volume = data.get("volume", "100%")
    style = data.get("style", "general")
    style_degree = data.get("styleDegree", "100")
    silence_ms = data.get("silenceMs", 0)

    if voice not in VOICES_DATA:
        return jsonify({"error": f"Unsupported voice: {voice}"}), 400
    available_styles = VOICES_DATA[voice].get("styles", ["general"])
    if style not in available_styles:
        style = "general"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()

    try:
        run_async(generate_tts_async(
            text=text, voice=voice, rate=rate, pitch=pitch, volume=volume,
            style=style, style_degree=str(style_degree),
            silence_ms=int(silence_ms) if silence_ms else 0,
            output_path=tmp_path))
        return send_file(tmp_path, mimetype="audio/mpeg", as_attachment=True,
                         download_name=f"tts_{voice}_{style}.mp3")
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return jsonify({"error": str(e)}), 500

@app.route("/api/preview", methods=["POST"])
def tts_preview():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request data empty"}), 400
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Text is empty"}), 400

    voice = data.get("voice", "zh-CN-XiaoxiaoNeural")
    rate = data.get("rate", "0%")
    pitch = data.get("pitch", "0Hz")
    volume = data.get("volume", "100%")
    style = data.get("style", "general")
    style_degree = data.get("styleDegree", "100")
    silence_ms = data.get("silenceMs", 0)

    if voice not in VOICES_DATA:
        return jsonify({"error": f"Unsupported voice: {voice}"}), 400
    available_styles = VOICES_DATA[voice].get("styles", ["general"])
    if style not in available_styles:
        style = "general"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()

    try:
        run_async(generate_tts_async(
            text=text, voice=voice, rate=rate, pitch=pitch, volume=volume,
            style=style, style_degree=str(style_degree),
            silence_ms=int(silence_ms) if silence_ms else 0,
            output_path=tmp_path))
        with open(tmp_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode("utf-8")
        os.unlink(tmp_path)
        return jsonify({"audio": audio_base64})
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 50)
    print("EdgeTTS Web Application Started")
    print("URL: http://127.0.0.1:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=False)
