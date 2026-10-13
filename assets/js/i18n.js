/* YourNameCombiner i18n: language dropdown (EN/FR/DE/ES/NL/PT/IT) with browser-language auto-detect. */
(function(){
"use strict";
var STORE="ync_lang";
var ORDER=["en","fr","de","es","nl","pt","it"];
var LABEL={en:"EN",fr:"FR",de:"DE",es:"ES",nl:"NL",pt:"PT",it:"IT"};
var FULL={en:"English",fr:"Fran\u00e7ais",de:"Deutsch",es:"Espa\u00f1ol",nl:"Nederlands",pt:"Portugu\u00eas",it:"Italiano"};
var T={};
window.__TDATA=T;
var TITLE={"fr": "Combinateur de noms : fusionnez deux noms en un (bébé, couple, marque et plus)", "de": "Namen-Kombinierer: Zwei Namen zu einem mixen (Baby, Paar, Marke und mehr)", "es": "Combinador de nombres: combine dos nombres en uno (bebé, pareja, marca y más)", "nl": "Naamcombinator: combineer twee namen tot één (baby, koppel, merk en meer)", "pt": "Combinador de nomes: combine dois nomes em um (bebê, casal, marca e mais)", "it": "Combinatore di nomi: combina due nomi in uno (bebè, coppia, marca e altro)"};
var METAD={"fr": "Combinateur de noms gratuit : fusionnez deux noms en créations originales. Noms de couple, prénoms de bébé, noms de marque et surnoms, instantané, avec prononciation et liens de partage.", "de": "Kostenloser Namen-Kombinierer: Mixen Sie zwei Namen zu kreativen neuen. Paarnamen, Babynamen, Markennamen und Spitznamen, sofort, mit Aussprache und Share-Links.", "es": "Combinador de nombres gratuito: fusione dos nombres en creaciones originales. Nombres de pareja, nombres de bebé, nombres de marca y apodos, al instante, con pronunciación y enlaces para compartir.", "nl": "Gratis naamcombinator: combineer twee namen tot creatieve nieuwe. Koppelnamen, babynamen, merknamen en bijnamen, direct, met uitspraak en deellinks.", "pt": "Combinador de nomes gratuito: funda dois nomes em criações originais. Nomes de casal, nomes de bebê, nomes de marca e apelidos, instantâneo, com pronúncia e links de compartilhamento.", "it": "Combinatore di nomi gratuito: fondi due nomi in creazioni originali. Nomi di coppia, nomi per bebè, nomi di marca e soprannomi, istantaneo, con pronuncia e link di condivisione."};
var origTitle=document.title;
var metaEl=document.querySelector('meta[name="description"]');
var origMeta=metaEl?metaEl.getAttribute("content"):"";
function norm(s){return String(s).replace(/\s+/g," ").trim();}
function lang(){
  var s=null;
  try{s=localStorage.getItem(STORE);}catch(e){}
  if(s&&LABEL[s])return s;
  var n=(navigator.language||"en").toLowerCase().split("-")[0];
  return LABEL[n]?n:"en";
}
function tr(en){
  var l=lang();
  if(l==="en")return en;
  var d=T[norm(en)];
  return (d&&d[l])||en;
}
window.__=tr;
function updateBar(l){
  var bar=document.getElementById("langBar");
  if(!bar)return;
  var btn=bar.querySelector(".lang-btn");
  if(btn)btn.innerHTML="\uD83C\uDF10 "+LABEL[l];
  var items=bar.querySelectorAll(".lang-menu button");
  for(var i=0;i<items.length;i++){
    items[i].classList.toggle("on",items[i].getAttribute("data-l")===l);
  }
}
function apply(){
  var l=lang(),i,el,k,d;
  try{document.documentElement.setAttribute("lang",l);}catch(e){}
  document.title=(l!=="en"&&TITLE[l])?TITLE[l]:origTitle;
  if(metaEl)metaEl.setAttribute("content",(l!=="en"&&METAD[l])?METAD[l]:origMeta);
  var texts=document.querySelectorAll("[data-i18n]");
  for(i=0;i<texts.length;i++){
    el=texts[i];k=el.getAttribute("data-i18n-key");
    if(!k){k=norm(el.textContent);el.setAttribute("data-i18n-key",k);}
    d=T[k];
    el.textContent=(l!=="en"&&d&&d[l])?d[l]:k;
  }
  var htmls=document.querySelectorAll("[data-i18n-html]");
  for(i=0;i<htmls.length;i++){
    el=htmls[i];
    var id=el.getAttribute("data-i18n-html");
    if(!el.getAttribute("data-i18n-src"))el.setAttribute("data-i18n-src",el.innerHTML);
    d=T[id];
    el.innerHTML=(l!=="en"&&d&&d[l])?d[l]:el.getAttribute("data-i18n-src");
  }
  var phs=document.querySelectorAll("[data-i18n-ph]");
  for(i=0;i<phs.length;i++){
    el=phs[i];k=el.getAttribute("data-i18n-ph-key");
    if(!k){k=norm(el.getAttribute("placeholder")||"");el.setAttribute("data-i18n-ph-key",k);}
    d=T[k];
    el.setAttribute("placeholder",(l!=="en"&&d&&d[l])?d[l]:k);
  }
  var tis=document.querySelectorAll("[data-i18n-title]");
  for(i=0;i<tis.length;i++){
    el=tis[i];k=el.getAttribute("data-i18n-title-key");
    if(!k){k=norm(el.getAttribute("title")||"");el.setAttribute("data-i18n-title-key",k);}
    d=T[k];
    el.setAttribute("title",(l!=="en"&&d&&d[l])?d[l]:k);
  }
  var ars=document.querySelectorAll("[data-i18n-aria]");
  for(i=0;i<ars.length;i++){
    el=ars[i];k=el.getAttribute("data-i18n-aria-key");
    if(!k){k=norm(el.getAttribute("aria-label")||"");el.setAttribute("data-i18n-aria-key",k);}
    d=T[k];
    el.setAttribute("aria-label",(l!=="en"&&d&&d[l])?d[l]:k);
  }
  updateBar(l);
  try{ document.dispatchEvent(new CustomEvent("i18n:change",{detail:{lang:l}})); }catch(e){}
}
function buildBar(){
  if(document.getElementById("langBar"))return;
  var host=document.querySelector("header .wrap")||document.querySelector("header");
  if(!host)return;
  var bar=document.createElement("div");
  bar.id="langBar";bar.className="lang-bar";
  var btn=document.createElement("button");
  btn.type="button";btn.className="lang-btn";
  btn.setAttribute("aria-haspopup","true");btn.setAttribute("aria-expanded","false");
  btn.setAttribute("aria-label","Language / Langue / Sprache / Idioma / Taal / Idioma / Lingua");
  var menu=document.createElement("div");
  menu.className="lang-menu";menu.setAttribute("role","menu");
  var h="",i;
  for(i=0;i<ORDER.length;i++){
    var c=ORDER[i];
    h+='<button type="button" role="menuitem" data-l="'+c+'">'+FULL[c]+'</button>';
  }
  menu.innerHTML=h;
  bar.appendChild(btn);bar.appendChild(menu);
  btn.addEventListener("click",function(e){
    if(e&&e.stopPropagation)e.stopPropagation();
    var open=bar.className.indexOf("open")>=0;
    if(open){bar.className="lang-bar";}else{bar.className="lang-bar open";}
    btn.setAttribute("aria-expanded",open?"false":"true");
  });
  menu.addEventListener("click",function(e){
    var b=e.target&&e.target.closest?e.target.closest("button"):null;
    if(!b)return;
    try{localStorage.setItem(STORE,b.getAttribute("data-l"));}catch(e2){}
    bar.className="lang-bar";
    btn.setAttribute("aria-expanded","false");
    apply();
  });
  document.addEventListener("click",function(){
    bar.className="lang-bar";
    btn.setAttribute("aria-expanded","false");
  });
  host.appendChild(bar);
  updateBar(lang());
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",function(){buildBar();apply();});
}else{buildBar();apply();}
window.__applyLang=apply;
})();
