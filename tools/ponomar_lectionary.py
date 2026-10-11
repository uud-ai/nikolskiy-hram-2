# Чтение рядовых (Апостол/Евангелие) из данных проекта Ponomar
# (https://github.com/typiconman/ponomar, лицензия GPL): файлы
# languages/xml/pentecostarion/NN.xml и lives/9xxx.xml. Условия Cmd (doy, nday,
# ndayF ...) вычисляются так же, как в Ponomar/DivineLiturgy1.java, поэтому
# Воздвиженская преступка/отступка и субботы/недели пред и по Воздвижении,
# Рождестве, Богоявлении получаются по уставу.
import re, os, json, datetime as dt, sys
import os as _os
B=_os.environ.get('PONOMAR_XML','ponomar/Ponomar/languages/xml')
def jdn_greg(d): return d.toordinal()+1721425
def julian_to_jdn(y,m,d):
    a=(14-m)//12; y2=y+4800-a; m2=m+12*a-3
    return d+(153*m2+2)//5+365*y2+y2//4-32083
def jdn_to_julian(j):
    c=j+32082; d=(4*c+3)//1461; e=c-1461*d//4; m=(5*e+2)//153
    return d-4800+m//10, m+3-12*(m//10), e-(153*m+2)//5+1
def pascha_jdn(y):  # Julian Pascha (Meeus)
    a=y%4;b=y%7;c=y%19;d=(19*c+15)%30;e=(2*a+4*b-d+34)%7
    m=(d+e+114)//31; day=(d+e+114)%31+1
    return julian_to_jdn(y,m,day)
def pmod(x,n):
    t=x%n; return n if t==0 else t
def doy_of(j):
    da=pmod(j+32083,1461)
    return 366 if da==1461 else pmod(da+59,365)-1
def ev(cmd,env):
    s=cmd.replace('&amp;','&').replace('&gt;','>').replace('&lt;','<')
    s=s.replace('&&',' and ').replace('||',' or ')
    s=re.sub(r'!(?!=)',' not ',s)
    return bool(eval(s,{},env))
BOOK={'Mt':'Мф','Mk':'Мк','Lk':'Лк','Jn':'Ин','Acts':'Деян','Rom':'Рим','I Cor':'1Кор','II Cor':'2Кор','Gal':'Гал','Eph':'Еф','Philip':'Флп','Col':'Кол','I Thess':'1Сол','II Thess':'2Сол','I Tim':'1Тим','II Tim':'2Тим','Tit':'Тит','Heb':'Евр','Jas':'Иак','I Pet':'1Пет','II Pet':'2Пет','I Jn':'1Ин','II Jn':'2Ин','III Jn':'3Ин','Jude':'Иуд','Philem':'Флм'}
def ref_ru(r):
    bk,rest=r.split('_',1)
    rest=re.sub(r'(\d)[a-z]',r'\1',rest).replace(' ','')
    return BOOK[bk]+'.'+rest
def zach(p):
    m=re.match(r'(\d+)',p or ''); return int(m.group(1)) if m else None
def readings(j):
    jy,_,_=jdn_to_julian(j)
    env={'nday':j-pascha_jdn(jy),'ndayP':j-pascha_jdn(jy-1),'ndayF':j-pascha_jdn(jy+1),
         'doy':doy_of(j),'dow':(j+1)%7,'dRank':0}
    nd=env['nday']
    if -70<=nd<0: return None,env
    line = (j-pascha_jdn(jy-1)+1) if nd< -70 else nd+1
    fn=f'{B}/pentecostarion/{line:02d}.xml'
    if not os.path.exists(fn): return None,env
    x=open(fn).read(); res={'apostle':[], 'gospel':[]}
    for m in re.finditer(r'<SAINT([^>]*)/>',x):
        a=m.group(1)
        cid=re.search(r'CId="(\d+)"',a).group(1)
        floater=re.fullmatch(r'99\d\d',cid) is not None
        if 'SId="0"' not in a and not floater: continue
        c=re.search(r'Cmd="([^"]*)"',a)
        if c and not ev(c.group(1),env): continue
        if floater:
            nm=open(f'{B}/../cu/ru/xml/lives/{cid}.xml').read()
            for n in re.finditer(r'<NAME([^>]*)/?>',nm):
                na=n.group(1); nc=re.search(r'Cmd="([^"]*)"',na); nv=re.search(r'Nominative="([^"]*)"',na)
                if nv and nv.group(1) and (not nc or ev(nc.group(1),env)): res.setdefault('names',[]).append(nv.group(1)); break
        y=open(f'{B}/lives/{cid}.xml').read()
        lit=re.search(r'<LITURGY>(.*?)</LITURGY>',y,re.S)
        if not lit: continue
        for s in re.finditer(r'<SCRIPTURE([^>]*)/>',lit.group(1)):
            t=s.group(1); c=re.search(r'Cmd="([^"]*)"',t)
            if c and not ev(c.group(1),env): continue
            ty=re.search(r'Type="(\w+)"',t).group(1)
            if ty not in ('apostol','gospel'): continue
            rd=re.search(r'Reading="([^"]+)"',t).group(1); pc=re.search(r'Pericope="([^"]*)"',t)
            ew=re.search(r'EffWeek="(\d+)"',t)
            res['apostle' if ty=='apostol' else 'gospel'].append((ref_ru(rd),zach(pc.group(1) if pc else ''),ew.group(1) if ew else None))
    return res,env
