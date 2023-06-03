#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
cd "${DIR}"

. ./version.txt

# Allow the user to override how Freeciv is downloaded.
if test -f dl_freeciv.sh ; then
  DL_FREECIV=dl_freeciv.sh
else
  DL_FREECIV=dl_freeciv_default.sh
fi

if ! ./$DL_FREECIV $FCREV ; then
  echo "Git checkout failed" >&2
  exit 1
fi

if ! ./apply_patches.sh ; then
  echo "Patching failed" >&2
  exit 1
fi

  mkdir -p build

  ( cd build
    meson setup ../freeciv -Dserver='freeciv-web' -Dclients=[] -Dfcmp=cli \
          -Djson-protocol=true -Dnls=false -Daudio=false -Druledit=false \
          -Ddefault_library=static -Dprefix=${HOME}/freeciv \
          -Doptimization=3
    ninja
  )


echo "done"
