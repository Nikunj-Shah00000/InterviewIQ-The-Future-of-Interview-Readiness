"from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
import json
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
MODEL_PROVIDER = \"anthropic\"
MODEL_NAME = \"claude-sonnet-4-5-20250929\"

app = FastAPI(title=\"CogniHire API\")
api_router = APIRouter(prefix=\"/api\")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(\"cognihire\")

# -------------------- Models --------------------
class StartInterviewReq(BaseModel):
    role: str = \"Software Engineer\"
    company: Optional[str] = \"TechCorp\"
    seniority: Optional[str] = \"Mid\"
    persona: Optional[str] = \"friendly\"  # friendly | skeptical | stoic | curveball
    jd_text: Optional[str] = None
    language: Optional[str] = \"en\"
    session_id: Optional[str] = None

class AnswerScoreReq(BaseModel):
    session_id: str
    question: str
    answer: str
    duration_sec: Optional[float] = 30.0
    pause_ms: Optional[int] = 0
    language: Optional[str] = \"en\"

class JDScrapeReq(BaseModel):
    url: Optional[str] = None
    jd_text: Optional[str] = None
    language: Optional[str] = \"en\"

class ResumeCheckReq(BaseModel):
    resume_text: str
    transcript: str
    language: Optional[str] = \"en\"

class ReverseScoreReq(BaseModel):
    questions: List[str]
    role: str = \"Software Engineer\"
    language: Optional[str] = \"en\"

class PitchScoreReq(BaseModel):
    concept: str
    pitch: str
    duration_sec: float
    language: Optional[str] = \"en\"

class ImposterReq(BaseModel):
    perceived: Dict[str, int]  # category -> 0-100
    actual: Dict[str, int]

class ProfileSave(BaseModel):
    name: str
    role: str
    target_company: Optional[str] = None
    language: Optional[str] = \"en\"


# -------------------- Helpers --------------------
def llm(session_id: str, system_msg: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def safe_json_extract(text: str) -> Dict[str, Any]:
    \"\"\"Pull first JSON object out of an LLM response.\"\"\"
    text = text.strip()
    # Try direct first
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r\"\{[\s\S]*\}\", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}


PERSONA_PROMPTS = {
    \"friendly\": \"You are a warm, encouraging interviewer. Use supportive tone, smile through words.\",
    \"skeptical\": \"You are a skeptical, probing interviewer. Challenge claims, ask 'why' twice.\",
    \"stoic\": \"You are a stoic, neutral senior engineer. Give no emotional cues. Be terse.\",
    \"curveball\": \"You are unpredictable. Start friendly, then suddenly become skeptical.\",
}

LANG_INSTRUCTION = {
    \"en\": \"Respond in English.\",
    \"es\": \"Responde en español.\",
    \"fr\": \"Réponds en français.\",
    \"hi\": \"हिंदी में उत्तर दें।\",
    \"de\": \"Antworte auf Deutsch.\",
}


# -------------------- Routes --------------------
@api_router.get(\"/\")
async def root():
    return {\"service\": \"CogniHire\", \"status\": \"online\"}


@api_router.post(\"/interview/start\")
async def start_interview(req: StartInterviewReq):
    session_id = req.session_id or str(uuid.uuid4())
    persona_desc = PERSONA_PROMPTS.get(req.persona, PERSONA_PROMPTS[\"friendly\"])
    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])

    system_msg = (
        f\"{persona_desc} You are interviewing a candidate for the role of {req.role} \"
        f\"at {req.company}, seniority: {req.seniority}. {lang} \"
        \"Return ONLY valid JSON: {\\"questions\\": [{\\"id\\":1,\\"text\\":\\"...\\",\\"category\\":\\"Technical|Behavioral|Cultural|Leadership\\",\\"difficulty\\":1-5}]} \"
        \"Generate exactly 5 questions covering Technical, Behavioral, Cultural, and Leadership.\"
    )
    prompt = \"Generate the interview script now.\"
    if req.jd_text:
        prompt += f\"

Tailor questions strictly to this job description:
{req.jd_text[:2000]}\"

    try:
        chat = llm(session_id, system_msg)
        resp = await chat.send_message(UserMessage(text=prompt))
        data = safe_json_extract(resp)
        questions = data.get(\"questions\") or []
        if not questions:
            raise ValueError(\"empty\")
    except Exception as e:
        logger.warning(f\"LLM start fallback: {e}\")
        questions = [
            {\"id\": 1, \"text\": f\"Walk me through a challenging project you led as a {req.role}.\", \"category\": \"Behavioral\", \"difficulty\": 3},
            {\"id\": 2, \"text\": \"Describe a technical trade-off you made under tight constraints.\", \"category\": \"Technical\", \"difficulty\": 4},
            {\"id\": 3, \"text\": f\"Why {req.company}? What about our culture excites you?\", \"category\": \"Cultural\", \"difficulty\": 2},
            {\"id\": 4, \"text\": \"Tell me about a time you disagreed with a manager.\", \"category\": \"Leadership\", \"difficulty\": 4},
            {\"id\": 5, \"text\": \"Where do you see your career in 3 years?\", \"category\": \"Behavioral\", \"difficulty\": 2},
        ]

    record = {
        \"session_id\": session_id,
        \"role\": req.role,
        \"company\": req.company,
        \"persona\": req.persona,
        \"language\": req.language,
        \"questions\": questions,
        \"created_at\": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.update_one({\"session_id\": session_id}, {\"$set\": record}, upsert=True)
    return {\"session_id\": session_id, \"questions\": questions, \"persona\": req.persona}


FLUFF_WORDS = [
    \"synergy\", \"leverage\", \"circle back\", \"deep dive\", \"low-hanging fruit\",
    \"thought leader\", \"paradigm\", \"best of breed\", \"move the needle\",
    \"value add\", \"actually\", \"basically\", \"literally\", \"like\", \"you know\",
    \"stuff\", \"things\", \"kind of\", \"sort of\", \"pretty much\", \"obviously\",
]


def detect_fluff(answer: str) -> Dict[str, Any]:
    found = []
    lower = answer.lower()
    for w in FLUFF_WORDS:
        idx = lower.find(w)
        if idx >= 0:
            found.append({\"word\": w, \"index\": idx})
    filler_re = re.findall(r\"\b(um|uh|er|ah|hmm)\b\", lower)
    return {\"buzzwords\": found, \"filler_count\": len(filler_re)}


def star_heuristic(answer: str) -> Dict[str, int]:
    a = answer.lower()
    situation = 10 if any(k in a for k in [\"when i\", \"at my\", \"we were\", \"the team\", \"context\"]) else 4
    task = 10 if any(k in a for k in [\"i was responsible\", \"my goal\", \"the task\", \"had to\", \"needed to\"]) else 4
    action = 15 if any(k in a for k in [\"i did\", \"i built\", \"i led\", \"i implemented\", \"i designed\", \"i decided\"]) else 6
    result = 15 if re.search(r\"\b\d+\s?(%|percent|x|users|ms|days|weeks|months)\b\", a) else 6
    return {\"situation\": situation, \"task\": task, \"action\": action, \"result\": result}


@api_router.post(\"/interview/answer\")
async def score_answer(req: AnswerScoreReq):
    fluff = detect_fluff(req.answer)
    base_star = star_heuristic(req.answer)
    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])

    system_msg = (
        f\"You are an expert interview coach. {lang} \"
        \"Score the candidate's answer. Return ONLY JSON with keys: \"
        \"star (object: situation,task,action,result each 0-25), \"
        \"overall (0-100), strengths (array of 2 short strings), \"
        \"weaknesses (array of 2 short strings), \"
        \"rewrite (one improved version <=80 words), \"
        \"confidence (0-100 estimate based on language).\"
    )
    prompt = (
        f\"Question: {req.question}
\"
        f\"Answer: {req.answer}
\"
        f\"Duration: {req.duration_sec}s, Pause: {req.pause_ms}ms\"
    )

    star = base_star.copy()
    overall = sum(base_star.values())
    strengths = [\"Clear structure\", \"On-topic\"]
    weaknesses = [\"Add metrics\", \"Reduce buzzwords\"] if fluff[\"buzzwords\"] else [\"Add specific examples\", \"Quantify impact\"]
    rewrite = \"\"
    confidence = max(30, 80 - fluff[\"filler_count\"] * 5 - len(fluff[\"buzzwords\"]) * 3)

    try:
        chat = llm(req.session_id + \"_score\", system_msg)
        resp = await chat.send_message(UserMessage(text=prompt))
        data = safe_json_extract(resp)
        if data:
            star = data.get(\"star\", star)
            overall = int(data.get(\"overall\", overall))
            strengths = data.get(\"strengths\", strengths)
            weaknesses = data.get(\"weaknesses\", weaknesses)
            rewrite = data.get(\"rewrite\", rewrite)
            confidence = int(data.get(\"confidence\", confidence))
    except Exception as e:
        logger.warning(f\"LLM score fallback: {e}\")

    # Pause classification
    pause_type = \"thoughtful\" if req.pause_ms < 2500 else (\"normal\" if req.pause_ms < 5000 else \"struggle\")
    pace_wpm = (len(req.answer.split()) / max(req.duration_sec, 1)) * 60
    wobble = []
    if pace_wpm > 180:
        wobble.append(\"speaking_too_fast\")
    if pace_wpm < 80 and req.duration_sec > 5:
        wobble.append(\"speaking_too_slow\")
    if fluff[\"filler_count\"] >= 3:
        wobble.append(\"excessive_fillers\")

    result = {
        \"star\": star,
        \"overall\": overall,
        \"strengths\": strengths,
        \"weaknesses\": weaknesses,
        \"rewrite\": rewrite,
        \"confidence\": confidence,
        \"fluff\": fluff,
        \"pause_type\": pause_type,
        \"pace_wpm\": round(pace_wpm, 1),
        \"wobble_alerts\": wobble,
    }

    await db.answers.insert_one({
        \"id\": str(uuid.uuid4()),
        \"session_id\": req.session_id,
        \"question\": req.question,
        \"answer\": req.answer,
        \"score\": result,
        \"created_at\": datetime.now(timezone.utc).isoformat(),
    })
    return result


@api_router.post(\"/jd/scrape\")
async def jd_scrape(req: JDScrapeReq):
    jd_text = req.jd_text or \"\"
    if req.url and not jd_text:
        # Very lightweight scrape via requests
        try:
            import requests
            r = requests.get(req.url, timeout=8, headers={\"User-Agent\": \"Mozilla/5.0 CogniHire\"})
            html = r.text
            text = re.sub(r\"<script[\s\S]*?</script>\", \" \", html)
            text = re.sub(r\"<style[\s\S]*?</style>\", \" \", text)
            text = re.sub(r\"<[^>]+>\", \" \", text)
            text = re.sub(r\"\s+\", \" \", text).strip()
            jd_text = text[:6000]
        except Exception as e:
            logger.warning(f\"scrape fail: {e}\")
            jd_text = \"\"

    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])
    system_msg = (
        f\"You analyze job descriptions. {lang} Return ONLY JSON: \"
        \"{\\"role\\":\\"...\\",\\"company\\":\\"...\\",\\"tech_stack\\":[...],\\"culture_keywords\\":[...],\"
        \"\\"top_skills\\":[...],\\"sample_questions\\":[5 tailored interview questions as strings]}\"
    )
    try:
        chat = llm(str(uuid.uuid4()), system_msg)
        resp = await chat.send_message(UserMessage(text=f\"JD:
{jd_text or 'Generic SWE role at a fast startup'}\"))
        data = safe_json_extract(resp)
    except Exception as e:
        logger.warning(f\"jd fallback: {e}\")
        data = {}
    if not data:
        data = {
            \"role\": \"Software Engineer\", \"company\": \"Inferred\",
            \"tech_stack\": [\"Python\", \"React\", \"AWS\"],
            \"culture_keywords\": [\"fast-paced\", \"ownership\", \"data-driven\"],
            \"top_skills\": [\"System design\", \"Communication\"],
            \"sample_questions\": [
                \"Walk me through your most complex backend system.\",
                \"How do you handle ambiguity?\",
                \"Tell me about a time you owned a project end-to-end.\",
                \"Describe an outage you debugged.\",
                \"Why this company?\"
            ]
        }
    return data


@api_router.post(\"/resume/check\")
async def resume_check(req: ResumeCheckReq):
    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])
    system_msg = (
        f\"You audit consistency between a resume and what the candidate verbally said. {lang} \"
        \"Return ONLY JSON: {\\"consistency_score\\":0-100,\\"red_flags\\":[strings],\"
        \"\\"matched_claims\\":[strings],\\"recommendation\\":\\"<=40 words\\"}\"
    )
    try:
        chat = llm(str(uuid.uuid4()), system_msg)
        resp = await chat.send_message(UserMessage(text=f\"RESUME:
{req.resume_text[:3000]}

TRANSCRIPT:
{req.transcript[:3000]}\"))
        data = safe_json_extract(resp)
    except Exception as e:
        logger.warning(f\"resume fallback: {e}\")
        data = {}
    if not data:
        data = {\"consistency_score\": 78, \"red_flags\": [\"Years of experience differs\"], \"matched_claims\": [\"Led team of 4\"], \"recommendation\": \"Reconcile timeline gap before the next round.\"}
    return data


@api_router.post(\"/reverse/score\")
async def reverse_score(req: ReverseScoreReq):
    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])
    system_msg = (
        f\"You evaluate the questions a candidate asks the interviewer. {lang} \"
        \"Return ONLY JSON: {\\"score\\":0-100,\\"depth\\":\\"surface|tactical|strategic\\",\"
        \"\\"top_pick\\":\\"...\\",\\"missing_topics\\":[strings],\\"upgrades\\":[{\\"original\\":\\"...\\",\\"better\\":\\"...\\"}]}\"
    )
    try:
        chat = llm(str(uuid.uuid4()), system_msg)
        resp = await chat.send_message(UserMessage(text=f\"Role: {req.role}
Questions:
- \" + \"
- \".join(req.questions)))
        data = safe_json_extract(resp)
    except Exception:
        data = {}
    if not data:
        data = {\"score\": 65, \"depth\": \"tactical\", \"top_pick\": req.questions[0] if req.questions else \"\", \"missing_topics\": [\"Strategy\", \"Failure modes\"], \"upgrades\": []}
    return data


@api_router.post(\"/pitch/score\")
async def pitch_score(req: PitchScoreReq):
    lang = LANG_INSTRUCTION.get(req.language, LANG_INSTRUCTION[\"en\"])
    system_msg = (
        f\"You judge 30-second elevator pitches to a non-technical audience. {lang} \"
        \"Return ONLY JSON: {\\"clarity\\":0-100,\\"simplicity\\":0-100,\\"hook\\":0-100,\"
        \"\\"overall\\":0-100,\\"verdict\\":\\"<=25 words\\"}\"
    )
    try:
        chat = llm(str(uuid.uuid4()), system_msg)
        resp = await chat.send_message(UserMessage(text=f\"Concept: {req.concept}
Duration: {req.duration_sec}s
Pitch: {req.pitch}\"))
        data = safe_json_extract(resp)
    except Exception:
        data = {}
    if not data:
        base = max(30, min(95, 80 - abs(req.duration_sec - 30) * 2))
        data = {\"clarity\": base, \"simplicity\": base - 5, \"hook\": base - 10, \"overall\": base, \"verdict\": \"Solid pitch, sharpen the hook.\"}
    return data


@api_router.post(\"/imposter/score\")
async def imposter(req: ImposterReq):
    gaps = {}
    for k, v in req.perceived.items():
        actual = req.actual.get(k, v)
        gaps[k] = actual - v  # positive => underestimated self
    avg_gap = sum(gaps.values()) / max(len(gaps), 1)
    label = \"Severe imposter syndrome\" if avg_gap > 25 else (
        \"Mild imposter syndrome\" if avg_gap > 10 else (
            \"Calibrated\" if abs(avg_gap) <= 10 else \"Overconfident\"))
    return {\"gaps\": gaps, \"average_gap\": round(avg_gap, 1), \"label\": label}


@api_router.get(\"/glassdoor/{company}\")
async def glassdoor_tips(company: str):
    # Curated demo dataset
    bank = {
        \"google\": [
            \"Heavy on system design + behavioral. Expect 'Googleyness'.\",
            \"Use frameworks: write code, talk trade-offs aloud.\",
            \"Stay calm — interviewers stay poker-faced on purpose.\",
        ],
        \"amazon\": [
            \"Leadership Principles are MANDATORY. STAR for every behavioral.\",
            \"They will probe with 'why' 3 times. Have data ready.\",
            \"Bar raiser is the toughest — usually round 3 or 4.\",
        ],
        \"meta\": [
            \"Coding rounds are timed and brutal. Optimal first.\",
            \"Behavioral focuses on 'move fast' and impact.\",
            \"Always quantify impact (DAU, latency, %).\",
        ],
        \"default\": [
            \"Ask about success metrics for the role in 90 days.\",
            \"Avoid filler words: 'um', 'like'.\",
            \"Have one strong 'failure' story with reflection.\",
        ],
    }
    key = company.lower()
    tips = bank.get(key, bank[\"default\"])
    questions = [
        \"Tell me about a time you missed a deadline.\",
        \"Walk me through a system you scaled.\",
        f\"Why {company}?\",
    ]
    return {\"company\": company, \"tips\": tips, \"recent_questions\": questions}


@api_router.post(\"/readiness/calculate\")
async def readiness(payload: Dict[str, Any]):
    \"\"\"payload: {scores: [overall floats], categories: {cat: avg}}\"\"\"
    scores = payload.get(\"scores\", [])
    cats = payload.get(\"categories\", {})
    avg = sum(scores) / len(scores) if scores else 50
    consistency = 100 - (max(scores) - min(scores)) if len(scores) > 1 else 70
    coverage = min(100, len(cats) * 25)
    readiness_score = round(avg * 0.6 + consistency * 0.2 + coverage * 0.2, 1)
    band = \"Elite\" if readiness_score >= 85 else (\"Strong\" if readiness_score >= 70 else (\"Developing\" if readiness_score >= 55 else \"Early\"))
    passport_id = \"CGN-\" + str(uuid.uuid4())[:8].upper()
    return {\"readiness_score\": readiness_score, \"band\": band, \"passport_id\": passport_id, \"issued_at\": datetime.now(timezone.utc).isoformat()}


MENTORS = [
    {\"id\": \"m1\", \"name\": \"Priya Sharma\", \"specialty\": \"System Design\", \"company\": \"ex-Google\", \"rating\": 4.9, \"avatar\": \"PS\"},
    {\"id\": \"m2\", \"name\": \"Marcus Lee\", \"specialty\": \"Behavioral / Leadership\", \"company\": \"ex-Amazon\", \"rating\": 4.8, \"avatar\": \"ML\"},
    {\"id\": \"m3\", \"name\": \"Sophia Romano\", \"specialty\": \"Product Sense\", \"company\": \"ex-Meta\", \"rating\": 4.95, \"avatar\": \"SR\"},
    {\"id\": \"m4\", \"name\": \"Daniel Müller\", \"specialty\": \"Coding / DSA\", \"company\": \"ex-Stripe\", \"rating\": 4.7, \"avatar\": \"DM\"},
    {\"id\": \"m5\", \"name\": \"Aarav Patel\", \"specialty\": \"Cultural Fit\", \"company\": \"ex-Netflix\", \"rating\": 4.85, \"avatar\": \"AP\"},
]


@api_router.post(\"/mentor/match\")
async def mentor_match(payload: Dict[str, Any]):
    weak = (payload.get(\"weakness\") or \"\").lower()
    ranked = sorted(MENTORS, key=lambda m: 0 if weak and weak in m[\"specialty\"].lower() else 1)
    return {\"mentors\": ranked[:3]}


@api_router.post(\"/profile\")
async def save_profile(p: ProfileSave):
    doc = p.model_dump()
    doc[\"id\"] = str(uuid.uuid4())
    doc[\"created_at\"] = datetime.now(timezone.utc).isoformat()
    await db.profiles.insert_one(doc)
    return {\"id\": doc[\"id\"], \"saved\": True}


@api_router.get(\"/profile/recent\")
async def recent_profile():
    docs = await db.profiles.find({}, {\"_id\": 0}).sort(\"created_at\", -1).to_list(1)
    return {\"profile\": docs[0] if docs else None}


# Shadow interviewer \"perfect\" answers (curated)
@api_router.post(\"/shadow\")
async def shadow_answer(payload: Dict[str, Any]):
    q = (payload.get(\"question\") or \"\").lower()
    if \"challenging project\" in q or \"behavior\" in q or \"tell me about\" in q:
        text = (\"Situation: At Acme last spring, our checkout had a 12% drop-off. \"
                \"Task: As tech lead, I owned the recovery. \"
                \"Action: I instrumented sessions, identified a flaky payment retry, \"
                \"shipped an idempotent retry queue, and ran A/B test. \"
                \"Result: Drop-off fell to 4%, recovering ~$1.8M ARR in 6 weeks.\")
    elif \"trade-off\" in q or \"technical\" in q:
        text = (\"We chose SQLite over Postgres for the edge cache: 40% lower p99 latency \"
                \"at the cost of replication. Mitigated with hourly snapshots; uptime stayed 99.95%.\")
    else:
        text = (\"I'd love working at this company because your public engineering blog on \"
                \"deterministic builds maps directly to a system I prototyped last quarter — \"
                \"we cut CI time 38% using the same approach.\")
    return {\"perfect_answer\": text}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)


@app.on_event(\"shutdown\")
async def shutdown_db_client():
    client.close()
"