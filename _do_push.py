import os
import subprocess
from pathlib import Path

site = Path(r"C:\Users\Saajid\Desktop\indieroll-movies-clean")
out = site / "_push_log.txt"
lines = []

def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd or site, capture_output=True, text=True, shell=False)
    lines.append(f"$ {' '.join(cmd)}")
    lines.append(r.stdout)
    lines.append(r.stderr)
    lines.append(f"exit={r.returncode}")
    return r

lines.append(f"site exists={site.exists()}")
lines.append(f"git dir={ (site/'.git').exists() }")
lines.append(f"breadcrumb in review={'breadcrumb' in (site/'review.html').read_text(encoding='utf-8')}")

# Ensure git repo
if not (site / ".git").exists():
    run(["git", "init", "-b", "main"])
    run(["git", "remote", "add", "origin", "https://github.com/saajidaman/indieroll-movies.git"])
else:
    run(["git", "remote", "-v"])

# gitignore
gi = site / ".gitignore"
if not gi.exists():
    gi.write_text(".vercel\n.env.local\n.imgtools\nnode_modules\n_push_log.txt\n", encoding="utf-8")
else:
    txt = gi.read_text(encoding="utf-8")
    if "_push_log.txt" not in txt:
        gi.write_text(txt.rstrip() + "\n_push_log.txt\n", encoding="utf-8")

env = os.environ.copy()
env.update({
    "GIT_AUTHOR_NAME": "saajidaman",
    "GIT_AUTHOR_EMAIL": "224410839+saajidaman@users.noreply.github.com",
    "GIT_COMMITTER_NAME": "saajidaman",
    "GIT_COMMITTER_EMAIL": "224410839+saajidaman@users.noreply.github.com",
})

run(["git", "add", "-A"])
# commit-tree to avoid co-author trailer
st = subprocess.run(["git", "status", "--porcelain"], cwd=site, capture_output=True, text=True)
lines.append("porcelain=" + st.stdout)
tree = subprocess.check_output(["git", "write-tree"], cwd=site, env=env, text=True).strip()
parent = None
try:
    parent = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=site, text=True).strip()
except subprocess.CalledProcessError:
    parent = None

cmd = ["git", "commit-tree", tree, "-m", "Add accessible breadcrumb navigation on all pages."]
if parent and parent != "HEAD":
    # only if valid
    try:
        subprocess.check_output(["git", "cat-file", "-t", parent], cwd=site, text=True)
        cmd = ["git", "commit-tree", tree, "-p", parent, "-m", "Add accessible breadcrumb navigation on all pages."]
    except Exception:
        pass

# For brand new repo or orphan after init, no parent is fine - but we want to replace remote main with full site
# Safer: always create fresh root commit with all files then force push
cmd = ["git", "commit-tree", tree, "-m", "The IndieRoll site with breadcrumb navigation."]
commit = subprocess.check_output(cmd, cwd=site, env=env, text=True).strip()
subprocess.check_call(["git", "update-ref", "refs/heads/main", commit], cwd=site, env=env)
subprocess.check_call(["git", "reset", "--hard", "main"], cwd=site, env=env)
lines.append("commit=" + commit)
lines.append(subprocess.check_output(["git", "log", "-1", "--format=%an %ae %s %b"], cwd=site, text=True))

# force push because history may diverge
push = subprocess.run(["git", "push", "-u", "origin", "main", "--force"], cwd=site, capture_output=True, text=True)
lines.append(push.stdout)
lines.append(push.stderr)
lines.append(f"push_exit={push.returncode}")

out.write_text("\n".join(lines), encoding="utf-8")
print("WROTE", out)
print("push_exit", push.returncode)
