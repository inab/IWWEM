#!/bin/sh

THEBASEDIR=$(dirname "$0")

case "$THEBASEDIR" in
	/*)
		;;
	*)
		THEBASEDIR="${PWD}/${THEBASEDIR}"
		;;
esac

LDESTDIR=ORFandDB-widgetCommon

LOCALWC="$THEBASEDIR"/weblauncher/js/"${LDESTDIR}"

# Getting the latest copy!
rm -rf "$LOCALWC"
svn update "$LOCALWC"

if [ ! -d "${LDESTDIR}"-svn ] ; then
	svn checkout svn://montblanc.cnio.es/trunk/projects/ORFandDB-X/bioVapor/widget/js "${LDESTDIR}"-svn
else
	svn update "${LDESTDIR}"-svn
fi

rm -rf "${LDESTDIR}"-snapshot
cp -dprf "${LDESTDIR}"-svn "${LDESTDIR}"-snapshot
find "${LDESTDIR}"-snapshot -name .svn -exec rm -rf {} \; >& /dev/null
find "${LDESTDIR}"-snapshot -type f -name .svnignore -exec rm -rf {} \; >& /dev/null
svn -R list "${LOCALWC}" | sed 's#/$##g' | sort > "$THEBASEDIR"/"${LDESTDIR}"-old.ls-R
find "${LDESTDIR}"-snapshot | tail -n +2 | cut -d / -f 2- | sort > "$THEBASEDIR"/"${LDESTDIR}"-snapshot.ls-R
diff "$THEBASEDIR"/"${LDESTDIR}"-old.ls-R "$THEBASEDIR"/"${LDESTDIR}"-snapshot.ls-R > "$THEBASEDIR"/"${LDESTDIR}"-ls-R.diff
cp -dprf "${LDESTDIR}"-snapshot/* "${LDESTDIR}"-snapshot/.[a-zA-Z]* "$LOCALWC"

cd "${LOCALWC}"
addedfiles=$(grep '^> ' "$THEBASEDIR"/"${LDESTDIR}"-ls-R.diff | cut -c 3-)
erasedfiles=$(grep '^< ' "$THEBASEDIR"/"${LDESTDIR}"-ls-R.diff | cut -c 3-)

echo "Files to add:"
echo "$addedfiles"
echo
echo "Files to erase:"
echo "$erasedfiles"
echo

if [ -n "$addedfiles" ] ; then
	svn add $(grep '^> ' "$THEBASEDIR"/"${LDESTDIR}"-ls-R.diff | cut -c 3-)
fi
if [ -n "$erasedfiles" ] ; then
	svn remove $(grep '^< ' "$THEBASEDIR"/"${LDESTDIR}"-ls-R.diff | cut -c 3-)
fi
svn commit
cd "$THEBASEDIR"
rm -rf "${LDESTDIR}"-snapshot "${LDESTDIR}"-old.ls-R "${LDESTDIR}"-snapshot.ls-R "${LDESTDIR}"-ls-R.diff
