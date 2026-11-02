from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/index.html';s=p.read_text()
s=s.replace('SKYBOUND BATTLE V5','ARCANUM REFORGED V6').replace('SKYBOUND V5','ARCANUM V6').replace('SKYBOUND ARENA','ARCANUM ARENA').replace('SKYBOUND BATTLE','ARCANUM REFORGED').replace('V5', 'V6')
s=s.replace('<link rel="stylesheet" href="/style.css">','<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/v6-theme.css">')
start=s.index('<div class="mast-content">');end=s.index('<div class="mast-trim">',start)
s=s[:start]+'''<div class="mast-content v6-mast-content"><div class="mast-battle-flag">✦ THE GUILD WAR CHRONICLES ✦</div><div class="eyebrow">ARCANUM REFORGED · SEASON 06</div><h1 class="logo-title"><span>FAIRY TAIL</span><em>MAGIC ARENA</em></h1><div class="v3-mark">ARCANUM REFORGED <b>VI</b></div><p class="tagline">하늘까지 펼쳐진 아레나. 마법이 부딪치는 순간, 전설이 시작된다.</p><div class="mast-actions v6-cta-list"><button id="goSelect" class="guild-menu guild-menu-primary"><span class="guild-menu-icon">⚔</span><span>온라인 대전</span><small>WORLD PVP</small><b>❯</b></button><button id="goAi" class="guild-menu"><span class="guild-menu-icon">✦</span><span>AI 아레나</span><small>SINGLE PLAYER</small><b>❯</b></button><button id="goHow" class="guild-menu"><span class="guild-menu-icon">⚜</span><span>조작 가이드</span><small>CONTROLS</small><b>❯</b></button></div><div class="mast-rule"><span>1 VS 1 · DUEL</span><span>1 VS 1 VS 1 · CHAOS</span><span>2 VS 2 · GUILD WAR</span><span>AI · BEST OF 3</span></div></div>''' + s[end:]
s=s.replace('<div class="section-heading"><span class="heading-line"></span><span class="heading-emblem">✣</span><h2>CHOOSE YOUR GUILD HERO</h2>', '<div class="section-heading"><span class="heading-line"></span><span class="heading-emblem">✣</span><h2>CHOOSE YOUR GUILD HERO</h2>')
s=s.replace('<div class="teaser-caption">NEXT BATTLE · MAGNOLIA GUILD SQUARE</div>', '<div class="teaser-caption">CHAPTER 06 · MAGNOLIA SKYBOUND CITY</div>')
s=s.replace('<div class="battle-top-actions">', '<div class="battle-top-actions"><span class="v6-battle-tag">✦ ARCANE · LIVE</span>')
s=s.replace('<div class="gamewrap"><div class="battlecanvas">','<div class="gamewrap"><div class="battlecanvas"><div class="v6-guild-rune" aria-hidden="true">✦</div>')
s=s.replace('<div class="skillheader"><span>ARCANE COMMAND · 3 HIT CHAIN</span><small>마법을 선택해 발동하세요</small></div>', '<div class="skillheader"><span>⚔　ARCANE COMMAND · 3 HIT CHAIN</span><small>J 연계 · Q E R 마법 · F 궁극기</small></div>')
s=s.replace('<footer class="copyright">', '<footer class="copyright">')
p.write_text(s)
