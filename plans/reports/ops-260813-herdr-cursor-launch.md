# Herdr + Cursor launch pattern (APF)

**Correct (interactive):**
```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# read .result.pane.pane_id
herdr agent start <name> --kind cursor --pane <pane_id> -- --yolo
# argv becomes: cursor-agent --yolo
herdr agent prompt <name> "…"
# If status stays idle with text in composer, submit:
herdr agent send-keys <name> enter
herdr agent wait <name> --timeout 300000
```

**Wrong for this workflow:** `herdr pane run … "cursor agent -p --trust --yolo"` (print mode; hard to lifecycle-manage).

**Optional:** `herdr integration install cursor` once per machine.
