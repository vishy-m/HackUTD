#!/usr/bin/env bash
# Optimizes every GLB in scripts/models/raw/ into public/models/ and refreshes the manifest.
#   1. Download a Sketchfab model as glTF/GLB (see public/models/manifest.json for links).
#   2. Save it as scripts/models/raw/<id>.glb where <id> is a manifest key (camry, rav4, corolla,
#      prius, tacoma, 4runner, highlander, map-car, map-truck).
#   3. Run: bash scripts/models/optimize.sh
#   4. Check orientation/paint material name at https://gltf.report and edit rotationY /
#      paintMaterial / mapBearingOffset for that entry in public/models/manifest.json.
# Hero cars target <5 MB / <=150k faces; map cars <=30k faces (use a lower ratio for those).
set -euo pipefail
cd "$(dirname "$0")/../.."
shopt -s nullglob
raw=(scripts/models/raw/*.glb)
if [ ${#raw[@]} -eq 0 ]; then echo "No GLBs in scripts/models/raw/"; fi
for in in "${raw[@]}"; do
  id="$(basename "$in" .glb)"
  out="public/models/${id}.glb"
  ratio=0.5
  case "$id" in map-*) ratio=0.25 ;; esac
  echo "-> $in => $out (simplify ratio $ratio)"
  npx gltf-transform optimize "$in" "$out" --compress draco --texture-compress webp --texture-size 2048 --simplify --simplify-ratio "$ratio" --vertex-layout separate
  ls -lh "$out"
done
node scripts/models/build-manifest.mjs
