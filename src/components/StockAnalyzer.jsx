"use client";
import { useState, useRef, useCallback } from "react";

const C = {
  bg:"#03070F", bgMid:"#070F23", bgCard:"#0C1830",
  cyan:"#00C3E6", gold:"#FFC83C", red:"#E03232",
  green:"#38D870", orange:"#FF8C28", white:"#FFFFFF",
  gray:"#E0ECF8", mid:"#B0C8E0", dim:"#7090B0",
  border:"rgba(0,195,230,0.18)",
};

const SYS_SEARCH = `You are a financial data assistant. Search the web for TODAY's live market data.
Reply ONLY in this exact format, nothing else:
PRICE:9.75
CURRENCY:€
NEWS:latest important news max 90 chars in Italian
ANALYSTS:analyst consensus max 80 chars in Italian
INSIDER:insider activity max 80 chars in Italian
DIVDATE:next ex-dividend date if known e.g. 2026-05-19 or UNKNOWN`;

const SYS_ANALYSIS = `Sei HYBRID AI, analista algoritmico d'élite. Usa i dati aggiornati forniti.
NON usare memoria interna per prezzi o news recenti.
NON fare analisi tecnica (no supporti, resistenze, medie mobili, RSI).
Restituisci SOLO JSON valido. Nessun testo prima o dopo. Tutto in italiano.

{"ticker":"str","company":"str","market":"str","currency":"str","price":"str","date":"str",
"sentiment":"RIALZISTA|RIBASSISTA|NEUTRALE","score":number,"verdict":"placeholder",
"summary":"max 200 car",
"dividend_alert":{"ex_date":"data stacco o N/D","amount":"importo cedola","yield_pct":"rendimento %","days_to_ex":"giorni mancanti o N/D","price_impact":"impatto atteso sul prezzo post-stacco","warning":"OK|WARN|KO"},
"fundamentals":{"revenue_trend":"max 80","profitability":"max 80","debt":"max 80","fcf":"max 80","score":number},
"valuation":{"pe":"max 70","pb":"max 70","ev_ebitda":"max 70","fair_value":"max 70","vs_peers":"max 80","score":number},
"dividend":{"yield":"max 60","payout":"max 60","history":"max 80","sustainability":"max 80","score":number},
"management":{"ceo":"max 70","strategy":"max 90","track_record":"max 90","score":number},
"analysts":{"consensus":"COMPRA|NEUTRALE|VENDI","target_avg":"max 40","target_high":"max 40","target_low":"max 40","num_analysts":"max 30","recent_changes":"max 90"},
"news_sentiment":{"latest_news":"max 110","sentiment_score":number,"key_event":"max 90","next_catalyst":"max 90"},
"insider_activity":{"recent_moves":"max 110","net_direction":"ACQUISTO|VENDITA|NEUTRO","notable":"max 90"},
"rumors_ma":{"active_rumors":"max 110","ma_probability":"ALTA|MEDIA|BASSA|NESSUNA","details":"max 90"},
"risks":{"macro":"max 90","regulatory":"max 90","operational":"max 90","score":number},
"catalysts_positive":["max 80","max 80","max 80"],
"catalysts_negative":["max 80","max 80","max 80"],
"what_can_go_right":"max 130","what_can_go_wrong":"max 130",
"underestimated_risk":"max 130","suitable_for":"max 110",
"checklist":[
  {"item":"max 60","status":"OK|WARN|KO"},{"item":"max 60","status":"OK|WARN|KO"},
  {"item":"max 60","status":"OK|WARN|KO"},{"item":"max 60","status":"OK|WARN|KO"},
  {"item":"max 60","status":"OK|WARN|KO"},{"item":"max 60","status":"OK|WARN|KO"}
]}`;

// Verdict automatico basato sullo score (standard finanziario internazionale)
function scoreToVerdict(s){
  if(s>=90) return "STRONG BUY";
  if(s>=75) return "BUY";
  if(s>=60) return "HOLD";
  if(s>=50) return "NEUTRAL";
  if(s>=20) return "SELL";
  return "STRONG SELL";
}

// Colore verdict
function verdictColor(v){
  if(v==="STRONG BUY")  return "#00E5A0";
  if(v==="BUY")         return "#38D870";
  if(v==="HOLD")        return "#FFC83C";
  if(v==="NEUTRAL")     return "#90A8C0";
  if(v==="SELL")        return "#FF6B35";
  if(v==="STRONG SELL") return "#E03232";
  return "#8090B0";
}

function sc(s){ return s>=65?"#38D870":s>=40?"#FFC83C":"#E03232"; }

function rr(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function wrapText(ctx,txt,x,y,maxW,lh){
  const words=String(txt||"").split(" ");let line="",ly=y;
  for(const w of words){
    const t=line?line+" "+w:w;
    if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,ly);line=w;ly+=lh;}
    else line=t;
  }
  if(line)ctx.fillText(line,x,ly);
  return ly+lh;
}

function makeJPEG(d,canvas){
  const W=1080,H=2700;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#030711");bg.addColorStop(.5,"#060F22");bg.addColorStop(1,"#030711");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(0,195,230,0.025)";ctx.lineWidth=1;
  for(let x=0;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const tg=ctx.createLinearGradient(0,0,W,0);
  tg.addColorStop(0,"transparent");tg.addColorStop(.3,"#00C3E6");tg.addColorStop(.65,"#FFC83C");tg.addColorStop(1,"transparent");
  ctx.fillStyle=tg;ctx.fillRect(0,0,W,3);
  const PAD=54,RW=W-108;
  ctx.fillStyle="#fff";ctx.font="bold 58px sans-serif";
  const hw=ctx.measureText("HYBRID").width;
  ctx.fillText("HYBRID",PAD,90);ctx.fillStyle="#00C3E6";ctx.fillText(" AI",PAD+hw,90);
  ctx.fillStyle="#00C3E6";ctx.font="13px monospace";ctx.fillText("ALGORITHMIC TRADING · STOCK ANALYZER",PAD,112);
  ctx.fillStyle="#4A6080";ctx.font="11px monospace";ctx.textAlign="right";
  ctx.fillText(d.date||"",W-PAD,78);ctx.fillStyle="#00C3E6";ctx.font="bold 11px monospace";
  ctx.fillText("ANALISI FONDAMENTALE",W-PAD,96);ctx.textAlign="left";
  ctx.strokeStyle="rgba(0,195,230,0.2)";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(PAD,130);ctx.lineTo(W-PAD,130);ctx.stroke();
  const vc={COMPRA:"#38D870",VENDI:"#E03232",MANTIENI:"#FFC83C",EVITA:"#E03232"}[d.verdict]||verdictColor(d.verdict)||"#8090B0";
  const sc2={RIALZISTA:"#38D870",RIBASSISTA:"#E03232",NEUTRALE:"#FFC83C"}[d.sentiment]||"#8090B0";
  ctx.fillStyle="#fff";ctx.font="bold 88px sans-serif";ctx.fillText(d.ticker||"",PAD,240);
  ctx.fillStyle="#C0D4EC";ctx.font="17px sans-serif";ctx.fillText(d.company||"",PAD,268);
  ctx.fillStyle="#7090B0";ctx.font="14px sans-serif";ctx.fillText(d.market||"",PAD,292);
  ctx.fillStyle="#FFC83C";ctx.font="bold 46px sans-serif";ctx.textAlign="right";
  ctx.fillText(`${d.currency||"€"}${d.price||"N/D"}`,W-PAD,232);
  ctx.fillStyle="#4A6080";ctx.font="bold 11px monospace";ctx.fillText("PREZZO AGGIORNATO",W-PAD,252);ctx.textAlign="left";
  let bx=PAD;
  [[d.verdict,verdictColor(d.verdict)||"#8090B0","VERDICT"],[d.sentiment,sc2,"SENTIMENT"]].forEach(([lbl,col,sub])=>{
    rr(ctx,bx,316,172,66,10);ctx.fillStyle=col+"22";ctx.fill();
    ctx.strokeStyle=col+"80";ctx.lineWidth=2;rr(ctx,bx,316,172,66,10);ctx.stroke();
    ctx.fillStyle=col;ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillText(lbl,bx+86,352);
    ctx.fillStyle="#6090B8";ctx.font="bold 9px monospace";ctx.fillText(sub,bx+86,368);
    ctx.textAlign="left";bx+=188;
  });
  const sv=d.score||50,scol=sc(sv);
  ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=9;
  ctx.beginPath();ctx.arc(W-PAD-56,350,52,0.75*Math.PI,2.25*Math.PI);ctx.stroke();
  ctx.strokeStyle=scol;ctx.lineWidth=9;ctx.lineCap="round";ctx.shadowColor=scol;ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(W-PAD-56,350,52,0.75*Math.PI,(0.75+(sv/100)*1.5)*Math.PI);ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle="#fff";ctx.font="bold 26px sans-serif";ctx.textAlign="center";
  ctx.fillText(sv,W-PAD-56,362);ctx.fillStyle="#6090B8";ctx.font="bold 9px monospace";ctx.fillText("SCORE",W-PAD-56,380);ctx.textAlign="left";
  ctx.strokeStyle="rgba(0,195,230,0.12)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(PAD,406);ctx.lineTo(W-PAD,406);ctx.stroke();
  ctx.fillStyle="#6090B8";ctx.font="bold 13px monospace";ctx.fillText("◈  SOMMARIO",PAD,432);
  ctx.fillStyle="rgba(8,16,42,0.9)";rr(ctx,PAD,442,RW,92,8);ctx.fill();
  ctx.strokeStyle="rgba(0,195,230,0.1)";ctx.lineWidth=1;rr(ctx,PAD,442,RW,92,8);ctx.stroke();
  ctx.fillStyle="#D0E8F8";ctx.font="15px sans-serif";
  wrapText(ctx,d.summary||"",PAD+16,470,RW-32,22);
  let cy=562;
  ctx.fillStyle="#6090B8";ctx.font="bold 13px monospace";ctx.fillText("◈  PUNTEGGI PER AREA",PAD,cy);cy+=16;
  const areas=[["FONDAMENTALI",d.fundamentals?.score||0],["VALUTAZIONE",d.valuation?.score||0],
    ["DIVIDENDO",d.dividend?.score||0],["MANAGEMENT",d.management?.score||0],["RISCHIO",100-(d.risks?.score||50)]];
  const sw=(RW-areas.length*10)/areas.length;
  areas.forEach(([lbl,s],i)=>{
    const sx=PAD+i*(sw+10),col=sc(s);
    ctx.fillStyle="rgba(8,16,42,0.95)";rr(ctx,sx,cy,sw,110,10);ctx.fill();
    ctx.strokeStyle="rgba(0,195,230,0.1)";ctx.lineWidth=1;rr(ctx,sx,cy,sw,110,10);ctx.stroke();
    ctx.fillStyle=col;ctx.font="bold 40px sans-serif";ctx.textAlign="center";ctx.fillText(s,sx+sw/2,cy+58);
    ctx.fillStyle="rgba(255,255,255,0.07)";rr(ctx,sx+14,cy+68,sw-28,8,4);ctx.fill();
    ctx.fillStyle=col;rr(ctx,sx+14,cy+68,(sw-28)*s/100,8,4);ctx.fill();
    ctx.fillStyle="#6090B8";ctx.font="bold 10px monospace";ctx.fillText(lbl,sx+sw/2,cy+98);ctx.textAlign="left";
  });
  cy+=126;
  function section(title,rows){
    ctx.fillStyle="#6090B8";ctx.font="bold 13px monospace";ctx.fillText(title,PAD,cy);cy+=14;
    rows.forEach(([k,v],i)=>{
      const rh=48;
      if(i%2===0){ctx.fillStyle="rgba(0,195,230,0.028)";ctx.fillRect(PAD,cy,RW,rh);}
      ctx.fillStyle="#5080A0";ctx.font="bold 12px monospace";ctx.fillText(k,PAD+14,cy+30);
      const kw=ctx.measureText(k).width;
      ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";
      wrapText(ctx,String(v||"—"),PAD+kw+22,cy+30,RW-kw-48,17);
      ctx.strokeStyle="rgba(0,195,230,0.07)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(PAD,cy+rh);ctx.lineTo(W-PAD,cy+rh);ctx.stroke();cy+=rh;
    });cy+=18;
  }
  section("◈  FONDAMENTALI",[["RICAVI",d.fundamentals?.revenue_trend],["REDDITIVITÀ",d.fundamentals?.profitability],["DEBITO",d.fundamentals?.debt],["FCF",d.fundamentals?.fcf]]);
  section("◈  VALUTAZIONE",[["P/E",d.valuation?.pe],["P/BV",d.valuation?.pb],["EV/EBITDA",d.valuation?.ev_ebitda],["FAIR VALUE",d.valuation?.fair_value],["VS PEER",d.valuation?.vs_peers]]);
  section("◈  ANALISTI",[["CONSENSO",d.analysts?.consensus],["TARGET MEDIO",d.analysts?.target_avg],["TARGET MAX",d.analysts?.target_high],["TARGET MIN",d.analysts?.target_low],["N. ANALISTI",d.analysts?.num_analysts],["MODIFICHE",d.analysts?.recent_changes]]);
  section("◈  DIVIDENDO",[["YIELD",d.dividend?.yield],["PAYOUT",d.dividend?.payout],["STORICO",d.dividend?.history],["SOSTENIBILITÀ",d.dividend?.sustainability]]);
  const da=d.dividend_alert||{};
  if(da.ex_date&&da.ex_date!=="N/D"){
    const dac={OK:"#38D870",WARN:"#FFC83C",KO:"#E03232"}[da.warning]||"#FFC83C";
    ctx.fillStyle=dac+"18";rr(ctx,PAD,cy,RW,76,8);ctx.fill();
    ctx.strokeStyle=dac+"55";ctx.lineWidth=1.5;rr(ctx,PAD,cy,RW,76,8);ctx.stroke();
    ctx.fillStyle=dac;ctx.font="bold 13px monospace";
    ctx.fillText(`💰 STACCO: ${da.ex_date}  ·  ${da.amount||"N/D"}  ·  ${da.yield_pct||"N/D"}`,PAD+14,cy+26);
    ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";
    wrapText(ctx,da.price_impact||"",PAD+14,cy+50,RW-28,17);cy+=94;
  }
  section("◈  NEWS & INSIDER",[["NEWS",d.news_sentiment?.latest_news],["EVENTO CHIAVE",d.news_sentiment?.key_event],["PROSSIMO CAT.",d.news_sentiment?.next_catalyst],["INSIDER",d.insider_activity?.recent_moves],["DIREZIONE",d.insider_activity?.net_direction]]);
  section("◈  M&A & RISCHI",[["M&A PROB.",d.rumors_ma?.ma_probability],["VOCI",d.rumors_ma?.active_rumors],["MACRO",d.risks?.macro],["REGOLATORIO",d.risks?.regulatory],["OPERATIVO",d.risks?.operational]]);
  ctx.fillStyle="#38D870";ctx.font="bold 13px monospace";ctx.fillText("◈  CATALIZZATORI POSITIVI",PAD,cy);cy+=16;
  (d.catalysts_positive||[]).forEach((it,i)=>{
    if(i%2===0){ctx.fillStyle="rgba(56,216,112,0.04)";ctx.fillRect(PAD,cy,RW,42);}
    ctx.fillStyle="#38D870";ctx.font="14px sans-serif";ctx.fillText("▲",PAD+12,cy+27);
    ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";wrapText(ctx,it,PAD+34,cy+27,RW-50,17);
    ctx.strokeStyle="rgba(56,216,112,0.08)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,cy+42);ctx.lineTo(W-PAD,cy+42);ctx.stroke();cy+=42;
  });cy+=10;
  ctx.fillStyle="#E03232";ctx.font="bold 13px monospace";ctx.fillText("◈  CATALIZZATORI NEGATIVI",PAD,cy);cy+=16;
  (d.catalysts_negative||[]).forEach((it,i)=>{
    if(i%2===0){ctx.fillStyle="rgba(224,50,50,0.04)";ctx.fillRect(PAD,cy,RW,42);}
    ctx.fillStyle="#E03232";ctx.font="14px sans-serif";ctx.fillText("▼",PAD+12,cy+27);
    ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";wrapText(ctx,it,PAD+34,cy+27,RW-50,17);
    ctx.strokeStyle="rgba(224,50,50,0.08)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,cy+42);ctx.lineTo(W-PAD,cy+42);ctx.stroke();cy+=42;
  });cy+=18;
  [[`✅ COSA PUÒ ANDARE BENE`,d.what_can_go_right,"#38D870"],[`❌ COSA PUÒ ANDARE MALE`,d.what_can_go_wrong,"#E03232"],[`⚡ RISCHIO SOTTOVALUTATO`,d.underestimated_risk,"#FF8C28"],[`👤 ADATTO A`,d.suitable_for,"#00C3E6"]].forEach(([lbl,val,col])=>{
    const words=String(val||"—").split(" ");let lines=[""];ctx.font="14px sans-serif";
    words.forEach(w=>{const l=lines[lines.length-1];const t=l?l+" "+w:w;if(ctx.measureText(t).width>RW-44&&l){lines.push(w);}else lines[lines.length-1]=t;});
    const bh=18+lines.length*20+14;
    ctx.fillStyle=col+"12";rr(ctx,PAD,cy,RW,bh,8);ctx.fill();
    ctx.strokeStyle=col+"35";ctx.lineWidth=1;rr(ctx,PAD,cy,RW,bh,8);ctx.stroke();
    ctx.fillStyle=col;ctx.font="bold 11px monospace";ctx.fillText(lbl,PAD+14,cy+17);
    ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";
    lines.forEach((l,i)=>ctx.fillText(l,PAD+14,cy+34+i*20));cy+=bh+8;
  });cy+=10;
  ctx.fillStyle="#6090B8";ctx.font="bold 13px monospace";ctx.fillText("◈  CHECKLIST",PAD,cy);cy+=14;
  (d.checklist||[]).forEach((c,i)=>{
    if(i%2===0){ctx.fillStyle="rgba(0,195,230,0.028)";ctx.fillRect(PAD,cy,RW,42);}
    const col={OK:"#38D870",WARN:"#FFC83C",KO:"#E03232"}[c.status]||"#8090B0";
    const st={OK:"✓ OK",WARN:"⚠ WARN",KO:"✗ KO"}[c.status]||"";
    ctx.fillStyle="#D8E8F8";ctx.font="14px sans-serif";ctx.fillText(String(c.item||""),PAD+14,cy+27);
    ctx.fillStyle=col;ctx.font="bold 12px monospace";ctx.textAlign="right";ctx.fillText(st,W-PAD-10,cy+27);ctx.textAlign="left";
    ctx.strokeStyle="rgba(0,195,230,0.07)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD,cy+42);ctx.lineTo(W-PAD,cy+42);ctx.stroke();cy+=42;
  });cy+=20;
  ctx.fillStyle="rgba(2,8,22,0.97)";ctx.fillRect(0,H-52,W,52);
  ctx.strokeStyle="rgba(0,195,230,0.15)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,H-52);ctx.lineTo(W,H-52);ctx.stroke();
  ctx.fillStyle="#00C3E6";ctx.font="bold 13px monospace";ctx.fillText("HYBRID AI  ·  algorithmic trading",PAD,H-20);
  ctx.fillStyle="#1E3060";ctx.font="10px monospace";ctx.textAlign="right";
  ctx.fillText("Solo a scopo informativo  ·  Non costituisce consulenza finanziaria",W-PAD,H-20);ctx.textAlign="left";
  const realH=Math.min(cy+60,H);
  const cropped=document.createElement("canvas");cropped.width=W;cropped.height=realH;
  cropped.getContext("2d").drawImage(canvas,0,0);
  return cropped.toDataURL("image/jpeg",0.95);
}

function buildReportHTML(d){
  const sc2=s=>s>=65?"#38D870":s>=40?"#FFC83C":"#E03232";
  const vc2print={
    "STRONG BUY":"#007A50","BUY":"#2a8a2a","HOLD":"#997700",
    "NEUTRAL":"#556677","SELL":"#cc5500","STRONG SELL":"#aa2222"
  };
  const vc=vc2print[d.verdict]||"#555";
  const sentCol={RIALZISTA:"#2a8a2a",RIBASSISTA:"#aa2222",NEUTRALE:"#997700"}[d.sentiment]||"#555";
  const da=d.dividend_alert||{};
  const daCol={OK:"#2a8a2a",WARN:"#997700",KO:"#aa2222"}[da.warning]||"#997700";
  const maColor={ALTA:"#aa2222",MEDIA:"#997700",BASSA:"#006688",NESSUNA:"#888"}[d.rumors_ma?.ma_probability||"NESSUNA"]||"#888";
  const ndColor={ACQUISTO:"#2a8a2a",VENDITA:"#aa2222",NEUTRO:"#997700"}[d.insider_activity?.net_direction||"NEUTRO"]||"#997700";
  const areas=[["FONDAMENTALI",d.fundamentals?.score||0],["VALUTAZIONE",d.valuation?.score||0],["DIVIDENDO",d.dividend?.score||0],["MANAGEMENT",d.management?.score||0],["RISCHIO",100-(d.risks?.score||50)]];
  const scPrint=s=>s>=65?"#2a8a2a":s>=40?"#997700":"#aa2222";
  const row=(k,v)=>`<tr><td class="lbl">${k}</td><td class="val">${v||"—"}</td></tr>`;
  const slab=(t,col="")=>`<div class="slab"${col?` style="color:${col}"`:""}">${t}</div>`;
  const box=(lbl,val,col)=>`<div style="border-left:3px solid ${col};background:#f7f7f7;border-radius:3px;padding:9px 12px;margin-bottom:8px"><div style="font-size:9px;letter-spacing:2px;font-weight:700;color:${col};margin-bottom:4px;text-transform:uppercase">${lbl}</div><div style="font-size:12px;line-height:1.7;color:#222">${val||"—"}</div></div>`;

  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>HYBRID AI — ${d.ticker} — ${d.date}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#ffffff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:12px;padding:28px 36px;max-width:900px;margin:0 auto}
.brand{color:#007A99;font-size:10px;letter-spacing:3px;font-weight:700;margin-bottom:18px;text-transform:uppercase}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #ddd;flex-wrap:wrap}
.ticker{font-size:46px;font-weight:900;color:#111;line-height:1}
.company{font-size:14px;color:#444;margin-top:4px}
.market{font-size:11px;color:#888;margin-top:2px}
.price-block{text-align:right}
.price{font-size:34px;font-weight:900;color:#7A5500}
.price-lbl{font-size:9px;letter-spacing:1px;color:#888}
.score-box{display:inline-block;padding:8px 16px;border-radius:5px;text-align:center;border:2px solid;margin-top:8px}
.score-num{font-size:24px;font-weight:900}
.score-lbl{font-size:8px;letter-spacing:2px;color:#888;margin-top:2px}
.badges{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.badge{padding:5px 12px;border-radius:5px;font-weight:900;font-size:12px;letter-spacing:1px;border:2px solid}
.summary{background:#f0f6fa;border-left:3px solid #007A99;border-radius:3px;padding:11px 14px;font-size:12px;line-height:1.8;color:#222;margin-bottom:14px}
.areas{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.area{flex:1 1 80px;background:#f5f5f5;border:1px solid #ddd;border-radius:5px;padding:10px 6px;text-align:center}
.area-num{font-size:22px;font-weight:900;margin-bottom:2px}
.area-bar-bg{height:4px;background:#ddd;border-radius:2px;overflow:hidden;margin-bottom:4px}
.area-bar-fill{height:100%;border-radius:2px}
.area-lbl{font-size:7px;letter-spacing:1px;color:#888;text-transform:uppercase}
.card{border:1px solid #ddd;border-radius:5px;padding:11px 13px;margin-bottom:9px;page-break-inside:avoid}
.slab{font-size:10px;letter-spacing:2px;font-weight:700;color:#005F7A;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid #e0e0e0;text-transform:uppercase}
table{width:100%;border-collapse:collapse}
tr:nth-child(even){background:#f9f9f9}
td{padding:6px 8px;font-size:12px;vertical-align:top;line-height:1.6}
.lbl{color:#5A6A7A;font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;width:130px;white-space:nowrap}
.val{color:#222}
.cat-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #eee;align-items:flex-start}
.checklist-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee}
.pill{font-size:9px;letter-spacing:1px;font-weight:700;padding:2px 8px;border-radius:3px;border:1px solid;white-space:nowrap}
.apills{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}
.apill{flex:1 1 70px;text-align:center;padding:6px 8px;border-radius:4px;border:1px solid}
.apill-val{font-size:12px;font-weight:700;margin-bottom:2px}
.apill-lbl{font-size:7px;letter-spacing:1px;color:#888}
.divpills{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}
.divpill{flex:1 1 70px;text-align:center;padding:6px 8px;border-radius:4px;border:1px solid}
.sbar-bg{height:5px;background:#e0e0e0;border-radius:3px;overflow:hidden;margin:5px 0 9px}
.footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9px;color:#aaa;flex-wrap:wrap;gap:5px}
@page{margin:1.5cm}
@media print{
  .card,.areas,.topbar,.summary{page-break-inside:avoid}
}
</style></head><body>

<div class="brand">HYBRID AI · Algorithmic Trading · Stock Analyzer v11 · ${d.date||""}</div>

<div class="topbar">
  <div>
    <div class="ticker">${d.ticker||""}</div>
    <div class="company">${d.company||""}</div>
    <div class="market">${d.market||""}</div>
    <div class="badges">
      <div class="badge" style="color:${vc};border-color:${vc};background:${vc}18">${d.verdict||"—"}&nbsp;<span style="font-size:8px;opacity:0.65">VERDICT</span></div>
      <div class="badge" style="color:${sentCol};border-color:${sentCol};background:${sentCol}18">${d.sentiment||"—"}&nbsp;<span style="font-size:8px;opacity:0.65">SENTIMENT</span></div>
    </div>
  </div>
  <div class="price-block">
    <div class="price">${d.currency||"€"}${d.price||"N/D"}</div>
    <div class="price-lbl">PREZZO AGGIORNATO</div>
    <div class="score-box" style="border-color:${scPrint(d.score||50)};background:${scPrint(d.score||50)}15">
      <div class="score-num" style="color:${scPrint(d.score||50)}">${d.score||50}</div>
      <div class="score-lbl">PUNTEGGIO</div>
    </div>
  </div>
</div>

<div class="summary">${d.summary||""}</div>

<div class="areas">
${areas.map(([lbl,s])=>`  <div class="area">
    <div class="area-num" style="color:${scPrint(s)}">${s}</div>
    <div class="area-bar-bg"><div class="area-bar-fill" style="width:${s}%;background:${scPrint(s)}"></div></div>
    <div class="area-lbl">${lbl}</div>
  </div>`).join("\n")}
</div>

${da.ex_date&&da.ex_date!=="N/D"?`<div class="card" style="border-color:${daCol};border-width:2px">
  <div class="slab" style="color:${daCol}">💰 Stacco Dividendo Imminente</div>
  <div class="divpills">
    ${[["DATA",da.ex_date],["CEDOLA",da.amount],["YIELD",da.yield_pct],["GIORNI",da.days_to_ex]].filter(([,v])=>v&&v!=="N/D").map(([l,v])=>`<div class="divpill" style="border-color:${daCol};background:${daCol}10"><div style="font-size:12px;font-weight:700;color:${daCol};margin-bottom:2px">${v}</div><div style="font-size:7px;letter-spacing:1px;color:#888;text-transform:uppercase">${l}</div></div>`).join("")}
  </div>
  <div style="font-size:12px;line-height:1.7;color:#333">${da.price_impact||""}</div>
</div>`:""}

<div class="card">
  ${slab("◈ Fondamentali")}
  <table>${row("Trend Ricavi",d.fundamentals?.revenue_trend)}${row("Redditività",d.fundamentals?.profitability)}${row("Debito",d.fundamentals?.debt)}${row("Free Cash Flow",d.fundamentals?.fcf)}</table>
</div>

<div class="card">
  ${slab("◈ Valutazione")}
  <table>${row("P/E",d.valuation?.pe)}${row("P/BV",d.valuation?.pb)}${row("EV/EBITDA",d.valuation?.ev_ebitda)}${row("Fair Value",d.valuation?.fair_value)}${row("Vs Peer",d.valuation?.vs_peers)}</table>
</div>

<div class="card">
  ${slab("◈ Dividendo")}
  <table>${row("Yield",d.dividend?.yield)}${row("Payout",d.dividend?.payout)}${row("Storico",d.dividend?.history)}${row("Sostenibilità",d.dividend?.sustainability)}</table>
</div>

<div class="card">
  ${slab("◈ Management & Strategia")}
  <table>${row("CEO",d.management?.ceo)}${row("Strategia",d.management?.strategy)}${row("Track Record",d.management?.track_record)}</table>
</div>

<div class="card">
  ${slab("◈ Consenso Analisti")}
  <div class="apills">
    ${[["CONSENSO",d.analysts?.consensus,{COMPRA:"#2a8a2a",NEUTRALE:"#997700",VENDI:"#aa2222"}[d.analysts?.consensus]||"#888"],
       ["TARGET MEDIO",d.analysts?.target_avg,"#007A99"],["TARGET MAX",d.analysts?.target_high,"#2a8a2a"],
       ["TARGET MIN",d.analysts?.target_low,"#aa2222"],["N. ANALISTI",d.analysts?.num_analysts,"#888"]].map(([l,v,col])=>
    `<div class="apill" style="border-color:${col};background:${col}12"><div class="apill-val" style="color:${col}">${v||"—"}</div><div class="apill-lbl">${l}</div></div>`).join("")}
  </div>
  <table>${row("Modifiche Recenti",d.analysts?.recent_changes)}</table>
</div>

<div class="card">
  ${slab("◈ News & Sentiment")}
  <div style="font-size:9px;letter-spacing:1px;color:#888;margin-bottom:3px">SENTIMENT: ${d.news_sentiment?.sentiment_score||50}/100</div>
  <div class="sbar-bg"><div style="height:100%;width:${d.news_sentiment?.sentiment_score||50}%;background:${scPrint(d.news_sentiment?.sentiment_score||50)}"></div></div>
  <table>${row("Ultime News",d.news_sentiment?.latest_news)}${row("Evento Chiave",d.news_sentiment?.key_event)}${row("Prossimo Cataliz.",d.news_sentiment?.next_catalyst)}</table>
</div>

<div class="card">
  ${slab("◈ Attività Insider")}
  <span class="pill" style="color:${ndColor};border-color:${ndColor};background:${ndColor}15;display:inline-block;margin-bottom:8px">DIREZIONE: ${d.insider_activity?.net_direction||"NEUTRO"}</span>
  <table>${row("Movimenti Recenti",d.insider_activity?.recent_moves)}${row("Dettagli",d.insider_activity?.notable)}</table>
</div>

<div class="card">
  ${slab("◈ Rumor & M&A")}
  <span class="pill" style="color:${maColor};border-color:${maColor};background:${maColor}15;display:inline-block;margin-bottom:8px">PROB. M&A: ${d.rumors_ma?.ma_probability||"NESSUNA"}</span>
  <table>${row("Voci Attive",d.rumors_ma?.active_rumors)}${row("Dettagli",d.rumors_ma?.details)}</table>
</div>

<div class="card">
  ${slab("◈ Rischi","#aa2222")}
  <table>${row("Macro",d.risks?.macro)}${row("Regolatorio",d.risks?.regulatory)}${row("Operativo",d.risks?.operational)}</table>
</div>

<div class="card">
  ${slab("◈ Catalizzatori Positivi","#2a8a2a")}
  ${(d.catalysts_positive||[]).map(it=>`<div class="cat-row"><span style="color:#2a8a2a;font-size:11px;flex-shrink:0;margin-top:2px">▲</span><span style="font-size:12px;color:#222;line-height:1.6">${it}</span></div>`).join("")}
</div>

<div class="card">
  ${slab("◈ Catalizzatori Negativi","#aa2222")}
  ${(d.catalysts_negative||[]).map(it=>`<div class="cat-row"><span style="color:#aa2222;font-size:11px;flex-shrink:0;margin-top:2px">▼</span><span style="font-size:12px;color:#222;line-height:1.6">${it}</span></div>`).join("")}
</div>

<div class="card">
  ${slab("◈ Valutazione Complessiva")}
  ${box("✅ Cosa può andare bene",d.what_can_go_right,"#2a8a2a")}
  ${box("❌ Cosa può andare male",d.what_can_go_wrong,"#aa2222")}
  ${box("⚡ Rischio sottovalutato",d.underestimated_risk,"#996600")}
  ${box("👤 Adatto a",d.suitable_for,"#005F7A")}
</div>

<div class="card">
  ${slab("◈ Checklist di Rischio")}
  ${(d.checklist||[]).map(c=>{
    const col={OK:"#2a8a2a",WARN:"#997700",KO:"#aa2222"}[c.status]||"#888";
    const st={OK:"✓ OK",WARN:"⚠ WARN",KO:"✗ KO"}[c.status]||"";
    return `<div class="checklist-row"><span style="font-size:12px;color:#222">${c.item||""}</span><span class="pill" style="color:${col};border-color:${col};background:${col}15">${st}</span></div>`;
  }).join("")}
</div>

<div class="footer">
  <span>HYBRID AI · algorithmic trading · hybridai.info@gmail.com</span>
  <span>⚠ Solo a scopo informativo · Non costituisce consulenza finanziaria</span>
</div>
</body></html>`;
}

function scCol(s){return s>=65?C.green:s>=40?C.gold:C.red;}

function ScoreBar({label,score}){
  const c=scCol(score);
  return(
    <div style={{flex:"1 1 95px",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 8px",textAlign:"center"}}>
      <div style={{fontSize:26,fontWeight:900,color:c,marginBottom:4}}>{score}</div>
      <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2,marginBottom:6,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${score}%`,background:c,borderRadius:2}}/>
      </div>
      <div style={{fontSize:9,letterSpacing:1,color:C.dim,lineHeight:1.3}}>{label}</div>
    </div>
  );
}

function Row({label,value}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.border}`,gap:14}}>
      <span style={{fontSize:12,color:C.dim,letterSpacing:1,textTransform:"uppercase",flexShrink:0,paddingTop:2,minWidth:86,fontWeight:700}}>{label}</span>
      <span style={{fontSize:15,color:C.gray,textAlign:"right",lineHeight:1.5}}>{value||"—"}</span>
    </div>
  );
}

function Card({title,children,accent}){
  return(
    <div style={{background:C.bgCard,border:`1px solid ${accent||C.border}`,borderRadius:12,padding:"18px 16px",position:"relative",overflow:"hidden"}}>
      {accent&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:13,letterSpacing:2,color:C.mid,fontWeight:700}}>{title}</span>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border},transparent)`}}/>
      </div>
      {children}
    </div>
  );
}

export default function StockAnalyzer(){
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [step,setStep]=useState("");
  const [data,setData]=useState(null);
  const [error,setError]=useState(null);
  const [imgUrl,setImgUrl]=useState(null);
  const [showReport,setShowReport]=useState(false);
  const [reportHtml,setReportHtml]=useState("");
  const canvasRef=useRef(null);
  const blobUrlRef=useRef(null);

  const analyze=useCallback(async()=>{
    if(!input.trim()||loading)return;
    setLoading(true);setData(null);setError(null);setImgUrl(null);
    if(blobUrlRef.current){URL.revokeObjectURL(blobUrlRef.current);blobUrlRef.current=null;}

    // helper fetch con timeout
    const fetchWithTimeout=(url,opts,ms=90000)=>{
      const ctrl=new AbortController();
      const tid=setTimeout(()=>ctrl.abort(),ms);
      return fetch(url,{...opts,signal:ctrl.signal}).finally(()=>clearTimeout(tid));
    };

    try{
      setStep("🔍 Ricerca prezzo aggiornato...");
      let realPrice="N/D",realCurrency="€",extra="";
      try{
        const pr=await fetchWithTimeout("/api/claude",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:SYS_SEARCH,
            tools:[{"type":"web_search_20250305","name":"web_search"}],
            messages:[{role:"user",content:`Trova prezzo attuale di oggi: ${input}`}]}),
        },30000); // 30s per la ricerca prezzo
        if(pr.ok){
          const pj=await pr.json();
          const pt=pj.content?.find(b=>b.type==="text")?.text||"";
          const pm=pt.match(/PRICE[:\s]+([0-9]+[.,][0-9]+)/i);
          const cm=pt.match(/CURRENCY[:\s]+([€$£¥\w]+)/i);
          if(pm)realPrice=pm[1].replace(",",".");
          if(cm)realCurrency=cm[1];
          const nm=pt.match(/NEWS[:\s]+(.+)/i);const am=pt.match(/ANALYSTS[:\s]+(.+)/i);
          const im=pt.match(/INSIDER[:\s]+(.+)/i);const dm=pt.match(/DIVDATE[:\s]+(.+)/i);
          if(nm)extra+=`News: ${nm[1]}. `;if(am)extra+=`Analisti: ${am[1]}. `;
          if(im)extra+=`Insider: ${im[1]}. `;if(dm)extra+=`Stacco dividendo: ${dm[1]}. `;
        }
      }catch(e){console.warn("price search failed, proceeding without price",e);}

      setStep("📊 Analisi fondamentale in corso...");
      const res=await fetchWithTimeout("/api/claude",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:SYS_ANALYSIS,
          messages:[{role:"user",content:`Titolo: ${input}\nPrezzo: ${realCurrency}${realPrice}\nDati: ${extra||"N/D"}\nData: ${new Date().toLocaleDateString("it-IT")}\nRestituisci SOLO il JSON valido, nessun testo aggiuntivo.`}]}),
      },90000); // 90s per l'analisi completa
      if(!res.ok){const t=await res.text();throw new Error(`API ${res.status}: ${t.slice(0,80)}`);}
      const json=await res.json();
      const raw=json.content?.find(b=>b.type==="text")?.text||"";
      const f=raw.indexOf("{"),l=raw.lastIndexOf("}");
      if(f===-1||l===-1)throw new Error("Risposta non valida — riprova.");
      const parsed=JSON.parse(raw.substring(f,l+1));
      // Verdict sempre calcolato dal score — standard finanziario internazionale
      parsed.verdict=scoreToVerdict(parsed.score||50);
      if(realPrice!=="N/D"){parsed.price=realPrice;parsed.currency=realCurrency;}
      parsed.date=new Date().toLocaleDateString("it-IT");
      setData(parsed);

      setStep("🎨 Generazione immagine sintetica...");
      await new Promise(r=>setTimeout(r,80));
      try{const url=makeJPEG(parsed,canvasRef.current);setImgUrl(url);}
      catch(e){console.error("jpeg err",e);}
      setStep("");setLoading(false);
    }catch(e){
      const msg=e.name==="AbortError"?"Timeout — la risposta ha impiegato troppo, riprova":e.message||"Errore";
      setError(msg);setStep("");setLoading(false);
    }
  },[input,loading]);

  // Mostra report in modal interno e triggera window.print() nell'iframe
  const openPdfReport=useCallback(()=>{
    if(!data)return;
    const html=buildReportHTML(data);
    setReportHtml(html);
    setShowReport(true);
  },[data]);

  const [copied,setCopied]=useState(false);
  const copyHtml=useCallback(async()=>{
    if(!reportHtml)return;
    try{
      await navigator.clipboard.writeText(reportHtml);
      setCopied(true);
      setTimeout(()=>setCopied(false),3000);
    }catch(e){
      // fallback textarea
      const ta=document.createElement("textarea");
      ta.value=reportHtml;
      ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(()=>setCopied(false),3000);
    }
  },[reportHtml]);

  const vc=data?verdictColor(data.verdict):C.cyan;
  const sc2c=data?({RIALZISTA:C.green,RIBASSISTA:C.red,NEUTRALE:C.gold}[data.sentiment]||C.dim):C.dim;
  const maColor={ALTA:C.red,MEDIA:C.gold,BASSA:C.cyan,NESSUNA:C.dim}[data?.rumors_ma?.ma_probability||"NESSUNA"]||C.dim;
  const ndColor={ACQUISTO:C.green,VENDITA:C.red,NEUTRO:C.gold}[data?.insider_activity?.net_direction||"NEUTRO"]||C.gold;
  const da=data?.dividend_alert||{};
  const daBorderColor={OK:C.green,WARN:C.gold,KO:C.red}[da.warning]||C.gold;

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.bgMid},#03070F 50%,${C.bgMid})`,fontFamily:"'Courier New',monospace",color:C.white}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:780,margin:"0 auto",padding:"24px 14px 60px"}}>

        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:10}}>
            <div style={{height:1,width:60,background:`linear-gradient(90deg,transparent,${C.cyan})`}}/>
            <span style={{color:C.cyan,fontSize:13,letterSpacing:6,fontWeight:700}}>HYBRID AI</span>
            <div style={{height:1,width:60,background:`linear-gradient(90deg,${C.cyan},transparent)`}}/>
          </div>
          <h1 style={{fontSize:"clamp(22px,5vw,32px)",fontWeight:900,letterSpacing:3,margin:"0 0 8px",color:C.white,textShadow:`0 0 30px rgba(0,195,230,0.35)`}}>STOCK ANALYZER</h1>
          <p style={{color:C.mid,fontSize:12,letterSpacing:2,margin:0}}>FONDAMENTALI · DIVIDENDI · ANALISTI · INSIDER · RUMOR · RISCHI</p>
        </div>

        <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px 18px 16px",marginBottom:16}}>
          <div style={{fontSize:12,letterSpacing:3,color:C.mid,marginBottom:12,fontWeight:700}}>INSERISCI TICKER O NOME TITOLO</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&analyze()}
              placeholder="es: ENEL  ·  NVDA  ·  Apple  ·  Ferragamo"
              style={{flex:"1 1 220px",background:"rgba(0,195,230,0.07)",border:`1px solid ${C.border}`,borderRadius:8,color:C.white,fontFamily:"inherit",fontSize:15,padding:"14px 16px",outline:"none"}}/>
            <button onClick={analyze} disabled={loading||!input.trim()}
              style={{background:loading?"rgba(0,195,230,0.06)":"rgba(0,195,230,0.18)",border:`1px solid ${loading?"rgba(0,195,230,0.2)":C.cyan}`,color:loading?"rgba(0,195,230,0.4)":C.cyan,fontFamily:"inherit",fontSize:13,letterSpacing:3,fontWeight:700,padding:"14px 22px",borderRadius:8,cursor:loading?"not-allowed":"pointer",whiteSpace:"nowrap",minWidth:140}}>
              {loading?(step||"..."):"▶ ANALIZZA"}
            </button>
          </div>
          <div style={{fontSize:13,color:C.mid,lineHeight:1.6,marginBottom:12}}>💡 Prezzo cercato automaticamente online — dati aggiornati</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["ENEL","SFER.MI","ENI","NVDA","UCG.MI","AAPL","TSLA","BTC"].map(t=>(
              <button key={t} onClick={()=>setInput(t)} style={{background:"rgba(0,195,230,0.1)",border:`1px solid rgba(0,195,230,0.28)`,color:C.mid,fontFamily:"inherit",fontSize:12,letterSpacing:1,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:600}}>{t}</button>
            ))}
          </div>
        </div>

        {error&&<div style={{background:"rgba(220,50,50,0.12)",border:"1px solid rgba(220,50,50,0.35)",borderRadius:10,padding:"14px 18px",marginBottom:14,color:"#FF8080",fontSize:14,lineHeight:1.5}}>⛔ {error}</div>}

        {data&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            <div style={{background:C.bgCard,border:`1px solid ${vc}35`,borderRadius:12,padding:"20px 18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${vc},transparent)`}}/>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
                <div style={{flex:"1 1 180px"}}>
                  <div style={{fontSize:"clamp(28px,7vw,46px)",fontWeight:900,letterSpacing:2,lineHeight:1,color:C.white}}>{data.ticker}</div>
                  <div style={{color:C.mid,fontSize:14,marginTop:5,lineHeight:1.5}}>{data.company}</div>
                  <div style={{color:C.dim,fontSize:12,marginTop:2}}>{data.market}</div>
                  <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap",alignItems:"center"}}>
                    {/* VERDICT — badge prominente */}
                    <div style={{background:`${vc}20`,border:`2px solid ${vc}`,borderRadius:10,padding:"10px 20px",textAlign:"center",minWidth:130}}>
                      <div style={{color:vc,fontSize:18,fontWeight:900,letterSpacing:2}}>{data.verdict}</div>
                      <div style={{color:C.dim,fontSize:8,letterSpacing:2,marginTop:3}}>VERDICT</div>
                    </div>
                    {/* SENTIMENT */}
                    <div style={{background:`${sc2c}14`,border:`2px solid ${sc2c}50`,borderRadius:10,padding:"10px 16px",textAlign:"center"}}>
                      <div style={{color:sc2c,fontSize:14,fontWeight:900,letterSpacing:2}}>{data.sentiment}</div>
                      <div style={{color:C.dim,fontSize:8,letterSpacing:2,marginTop:3}}>SENTIMENT</div>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"clamp(26px,6vw,40px)",fontWeight:900,color:C.gold}}>{data.currency||"€"}{data.price}</div>
                  <div style={{color:C.dim,fontSize:10,letterSpacing:2,marginBottom:10}}>PREZZO AGGIORNATO</div>
                  <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",background:`${scCol(data.score)}18`,border:`2px solid ${scCol(data.score)}45`,borderRadius:10,padding:"10px 20px"}}>
                    <div style={{fontSize:32,fontWeight:900,color:scCol(data.score)}}>{data.score}</div>
                    <div style={{fontSize:8,letterSpacing:2,color:C.dim}}>PUNTEGGIO</div>
                  </div>
                </div>
              </div>
              <div style={{marginTop:14,background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"12px 14px",fontSize:14,color:C.gray,lineHeight:1.8}}>{data.summary}</div>
            </div>

            {da.ex_date&&da.ex_date!=="N/D"&&(
              <div style={{background:C.bgCard,border:`2px solid ${daBorderColor}50`,borderRadius:12,padding:"18px 16px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${daBorderColor},transparent)`}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,letterSpacing:2,color:daBorderColor,fontWeight:700}}>💰  STACCO DIVIDENDO IMMINENTE</span>
                  {da.warning==="WARN"&&<span style={{background:"rgba(255,200,60,0.2)",border:"1px solid rgba(255,200,60,0.5)",color:C.gold,fontSize:10,padding:"3px 10px",borderRadius:4,fontWeight:700}}>⚠ ATTENZIONE</span>}
                  {da.warning==="KO"&&<span style={{background:"rgba(220,50,50,0.2)",border:"1px solid rgba(220,50,50,0.5)",color:C.red,fontSize:10,padding:"3px 10px",borderRadius:4,fontWeight:700}}>⛔ RISCHIO CORREZIONE</span>}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  {[["DATA STACCO",da.ex_date,daBorderColor],["CEDOLA",da.amount,C.gold],["YIELD",da.yield_pct,C.green]].map(([l,v,col])=>(
                    <div key={l} style={{flex:"1 1 80px",background:`${col}12`,border:`1px solid ${col}30`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:col}}>{v||"N/D"}</div>
                      <div style={{fontSize:8,letterSpacing:2,color:C.dim,marginTop:3}}>{l}</div>
                    </div>
                  ))}
                  {da.days_to_ex&&da.days_to_ex!=="N/D"&&(
                    <div style={{flex:"1 1 80px",background:"rgba(0,195,230,0.1)",border:`1px solid rgba(0,195,230,0.3)`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.cyan}}>{da.days_to_ex}</div>
                      <div style={{fontSize:8,letterSpacing:2,color:C.dim,marginTop:3}}>GIORNI</div>
                    </div>
                  )}
                </div>
                <div style={{fontSize:14,color:C.gray,lineHeight:1.6,background:"rgba(0,0,0,0.2)",borderRadius:6,padding:"10px 12px"}}>{da.price_impact||"—"}</div>
              </div>
            )}

            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[["FONDAMENTALI",data.fundamentals?.score||0],["VALUTAZIONE",data.valuation?.score||0],
                ["DIVIDENDO",data.dividend?.score||0],["MANAGEMENT",data.management?.score||0],
                ["RISCHIO",100-(data.risks?.score||50)]].map(([l,s])=>(<ScoreBar key={l} label={l} score={s}/>))}
            </div>

            <Card title="📊  FONDAMENTALI"><Row label="Trend Ricavi" value={data.fundamentals?.revenue_trend}/><Row label="Redditività" value={data.fundamentals?.profitability}/><Row label="Debito" value={data.fundamentals?.debt}/><Row label="FCF" value={data.fundamentals?.fcf}/></Card>
            <Card title="💰  VALUTAZIONE"><Row label="P/E" value={data.valuation?.pe}/><Row label="P/BV" value={data.valuation?.pb}/><Row label="EV/EBITDA" value={data.valuation?.ev_ebitda}/><Row label="Fair Value" value={data.valuation?.fair_value}/><Row label="Vs Peer" value={data.valuation?.vs_peers}/></Card>
            <Card title="💸  DIVIDENDO"><Row label="Yield" value={data.dividend?.yield}/><Row label="Payout" value={data.dividend?.payout}/><Row label="Storico" value={data.dividend?.history}/><Row label="Sostenibilità" value={data.dividend?.sustainability}/></Card>
            <Card title="👔  MANAGEMENT"><Row label="CEO" value={data.management?.ceo}/><Row label="Strategia" value={data.management?.strategy}/><Row label="Track Record" value={data.management?.track_record}/></Card>

            <Card title="📈  ANALISTI">
              <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                {[[data.analysts?.consensus,{COMPRA:C.green,NEUTRALE:C.gold,VENDI:C.red}[data.analysts?.consensus]||C.dim,"CONSENSO"],[data.analysts?.target_avg,C.cyan,"TARGET MEDIO"],[data.analysts?.num_analysts,C.dim,"ANALISTI"]].map(([v,col,lbl])=>(
                  <div key={lbl} style={{flex:"1 1 80px",background:`${col}0D`,border:`1px solid ${col}28`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:700,color:col}}>{v||"—"}</div>
                    <div style={{fontSize:8,letterSpacing:2,color:C.dim,marginTop:4}}>{lbl}</div>
                  </div>
                ))}
              </div>
              <Row label="Target Max" value={data.analysts?.target_high}/><Row label="Target Min" value={data.analysts?.target_low}/><Row label="Modifiche" value={data.analysts?.recent_changes}/>
            </Card>

            <Card title="📰  NEWS & SENTIMENT">
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:C.dim,letterSpacing:2,marginBottom:6}}>SENTIMENT NEWS</div>
                <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${data.news_sentiment?.sentiment_score||50}%`,background:scCol(data.news_sentiment?.sentiment_score||50),borderRadius:3}}/>
                </div>
              </div>
              <Row label="News" value={data.news_sentiment?.latest_news}/><Row label="Prossimo cat." value={data.news_sentiment?.next_catalyst}/><Row label="Evento chiave" value={data.news_sentiment?.key_event}/>
            </Card>

            <Card title="🔍  INSIDER" accent={ndColor}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:14,color:C.mid,fontWeight:600}}>Direzione netta</span>
                <span style={{background:`${ndColor}20`,border:`1px solid ${ndColor}50`,color:ndColor,fontSize:11,letterSpacing:2,padding:"4px 12px",borderRadius:4,fontWeight:700}}>{data.insider_activity?.net_direction||"NEUTRO"}</span>
              </div>
              <div style={{fontSize:15,color:C.gray,lineHeight:1.7,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>{data.insider_activity?.recent_moves||"—"}</div>
              <div style={{fontSize:14,color:C.mid,lineHeight:1.6,paddingTop:10}}>{data.insider_activity?.notable||"—"}</div>
            </Card>

            <div style={{background:C.bgCard,border:`1px solid ${maColor}35`,borderRadius:12,padding:"18px 16px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${maColor},transparent)`}}/>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
                <span style={{fontSize:13,letterSpacing:2,color:C.mid,fontWeight:700}}>🔮  RUMOR & M&A</span>
                <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border},transparent)`}}/>
                <span style={{background:`${maColor}20`,border:`1px solid ${maColor}45`,color:maColor,fontSize:11,letterSpacing:2,padding:"4px 12px",borderRadius:4,fontWeight:700}}>M&A: {data.rumors_ma?.ma_probability||"NESSUNA"}</span>
              </div>
              <div style={{fontSize:15,color:C.gray,lineHeight:1.7,marginBottom:8}}>{data.rumors_ma?.active_rumors||"Nessun rumor"}</div>
              {data.rumors_ma?.details&&<div style={{fontSize:14,color:C.mid,lineHeight:1.6}}>{data.rumors_ma.details}</div>}
            </div>

            <Card title="⚠️  RISCHI"><Row label="Macro" value={data.risks?.macro}/><Row label="Regolatorio" value={data.risks?.regulatory}/><Row label="Operativo" value={data.risks?.operational}/></Card>

            {[[data.catalysts_positive,true,"▲ CATALIZZATORI POSITIVI"],[data.catalysts_negative,false,"▼ CATALIZZATORI NEGATIVI"]].map(([items,pos,title])=>(
              <div key={title} style={{background:pos?"rgba(56,216,112,0.05)":"rgba(224,50,50,0.05)",border:`1px solid ${pos?"rgba(56,216,112,0.2)":"rgba(224,50,50,0.2)"}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontSize:12,letterSpacing:2,color:pos?C.green:C.red,fontWeight:700,marginBottom:14}}>{title}</div>
                {(items||[]).map((item,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:pos?C.green:C.red,fontSize:14,flexShrink:0}}>{pos?"▲":"▼"}</span><span style={{fontSize:15,color:C.gray,lineHeight:1.6}}>{item}</span></div>))}
              </div>
            ))}

            <Card title="🎯  VALUTAZIONE COMPLESSIVA">
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[["✅ Cosa può andare bene",data.what_can_go_right,C.green],["❌ Cosa può andare male",data.what_can_go_wrong,C.red],["⚡ Rischio sottovalutato",data.underestimated_risk,C.orange],["👤 Adatto a",data.suitable_for,C.cyan]].map(([lbl,val,col])=>(
                  <div key={lbl} style={{padding:"12px 14px",background:`${col}08`,border:`1px solid ${col}22`,borderRadius:8}}>
                    <div style={{fontSize:10,letterSpacing:2,color:col,fontWeight:700,marginBottom:6}}>{lbl}</div>
                    <div style={{fontSize:15,color:C.gray,lineHeight:1.7}}>{val||"—"}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="◈  CHECKLIST">
              {(data.checklist||[]).map((c,i)=>{
                const col=({OK:C.green,WARN:C.gold,KO:C.red}[c.status]||C.dim);
                const st=({OK:"✓ OK",WARN:"⚠ ATT.",KO:"✗ KO"}[c.status]||c.status);
                return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.border}`,gap:10}}><span style={{fontSize:15,color:C.gray,lineHeight:1.5}}>{c.item}</span><span style={{background:`${col}18`,border:`1px solid ${col}45`,color:col,fontSize:10,letterSpacing:1,padding:"4px 10px",borderRadius:4,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>{st}</span></div>);
              })}
            </Card>

            {imgUrl&&(
              <div style={{background:C.bgCard,border:`1px solid rgba(0,195,230,0.3)`,borderRadius:12,padding:"20px 18px"}}>
                <div style={{fontSize:13,letterSpacing:2,color:C.cyan,marginBottom:6,fontWeight:700}}>🖼 RIEPILOGO VISIVO — JPEG</div>
                <div style={{fontSize:13,color:C.mid,marginBottom:14,lineHeight:1.6,background:"rgba(0,195,230,0.07)",borderRadius:8,padding:"10px 14px"}}>
                  📥 <strong style={{color:C.white}}>Click destro</strong> sull'immagine → <strong style={{color:C.gold}}>"Salva immagine con nome"</strong>
                </div>
                <img src={imgUrl} alt={`Riepilogo ${data.ticker}`} style={{width:"100%",borderRadius:10,border:`1px solid rgba(0,195,230,0.2)`,display:"block"}}/>
              </div>
            )}

            <div style={{background:C.bgCard,border:`2px solid rgba(255,200,60,0.4)`,borderRadius:12,padding:"22px 20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
              <div style={{fontSize:14,letterSpacing:2,color:C.gold,marginBottom:8,fontWeight:700}}>📄 SALVA ANALISI COMPLETA — PDF</div>
              {!showReport?(
                <>
                  <div style={{fontSize:13,color:C.mid,lineHeight:1.9,marginBottom:18,background:"rgba(255,200,60,0.06)",borderRadius:8,padding:"12px 16px"}}>
                    Carica il report, poi copia l'HTML e salvalo come file <strong style={{color:C.gold}}>.html</strong> — aprilo in Edge per stamparlo come PDF.
                  </div>
                  <button onClick={openPdfReport}
                    style={{width:"100%",background:"rgba(255,200,60,0.16)",border:`2px solid ${C.gold}`,color:C.gold,fontFamily:"'Courier New',monospace",fontSize:15,letterSpacing:3,fontWeight:700,padding:"20px",borderRadius:10,cursor:"pointer"}}>
                    📄 CARICA REPORT
                  </button>
                </>
              ):(
                <>
                  {/* BARRA AZIONI */}
                  <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                    <button onClick={copyHtml}
                      style={{flex:"1 1 180px",background:copied?"rgba(56,216,112,0.2)":"rgba(255,200,60,0.2)",border:`2px solid ${copied?C.green:C.gold}`,color:copied?C.green:C.gold,fontFamily:"'Courier New',monospace",fontSize:14,letterSpacing:2,fontWeight:700,padding:"14px",borderRadius:8,cursor:"pointer",transition:"all 0.3s"}}>
                      {copied?"✅ HTML COPIATO!":"📋 COPIA HTML REPORT"}
                    </button>
                    <button onClick={()=>setShowReport(false)}
                      style={{flex:"0 0 auto",background:"transparent",border:`1px solid rgba(255,255,255,0.15)`,color:C.dim,fontFamily:"'Courier New',monospace",fontSize:12,padding:"14px 18px",borderRadius:8,cursor:"pointer"}}>
                      ✕ CHIUDI
                    </button>
                  </div>
                  <div style={{fontSize:13,color:C.mid,lineHeight:2,marginBottom:12,background:"rgba(255,200,60,0.06)",borderRadius:8,padding:"12px 16px"}}>
                    <strong style={{color:C.white,fontSize:14}}>Per salvare il PDF:</strong><br/>
                    <strong style={{color:C.gold}}>①</strong> Clicca <strong style={{color:C.white}}>"📋 COPIA HTML REPORT"</strong><br/>
                    <strong style={{color:C.gold}}>②</strong> Apri <strong style={{color:C.white}}>Blocco note</strong> (o qualsiasi editor di testo)<br/>
                    <strong style={{color:C.gold}}>③</strong> Incolla con <strong style={{color:C.white}}>Ctrl+V</strong> → Salva come <strong style={{color:C.gold}}>report.html</strong><br/>
                    <strong style={{color:C.gold}}>④</strong> Apri <strong style={{color:C.white}}>report.html</strong> in Edge → <strong style={{color:C.white}}>Ctrl+P</strong> → <strong style={{color:C.gold}}>"Microsoft Print to PDF"</strong>
                  </div>
                  {/* IFRAME con il report — window.print() stampa tutto il suo contenuto */}
                  <iframe
                    srcDoc={reportHtml}
                    style={{width:"100%",height:600,border:`1px solid rgba(255,200,60,0.2)`,borderRadius:8,background:"#fff"}}
                    title="Report PDF"
                  />
                </>
              )}
            </div>

            <div style={{textAlign:"center",color:"#1e3060",fontSize:11,letterSpacing:2,padding:"6px"}}>
              ⚠ Solo a scopo informativo · Non costituisce consulenza finanziaria
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
