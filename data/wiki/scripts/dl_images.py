import json, os, re, urllib.request, time, hashlib
UA={"User-Agent":"el-pueblo-research/1.0 (personal game project)"}
idx=json.load(open("full/image_index.json"))["files"]
D="full/img"; os.makedirs(D, exist_ok=True)
ok=skip=fail=0; failed=[]
for name,meta in idx.items():
    safe=re.sub(r"[^A-Za-z0-9._-]+","_",name)
    path=os.path.join(D,safe)
    if os.path.exists(path) and os.path.getsize(path)>0: skip+=1; continue
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(meta["url"],headers=UA),timeout=90) as r, open(path+".part","wb") as f:
                while True:
                    b=r.read(1<<16)
                    if not b: break
                    f.write(b)
            os.replace(path+".part",path); ok+=1; break
        except Exception as e:
            if attempt==2: fail+=1; failed.append((name,str(e)[:80]))
            time.sleep(2*(attempt+1))
    if (ok+skip+fail)%200==0: print("progress", ok, skip, fail, flush=True)
print("downloaded", ok, "skipped", skip, "failed", fail)
json.dump(failed, open("full/image_failures.json","w"), ensure_ascii=False, indent=1)
