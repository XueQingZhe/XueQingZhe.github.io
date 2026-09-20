// Existing bookmarks from the theme study return to the chosen water garden.
for(const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')){
  if(anchor.hasAttribute('download')||anchor.getAttribute('href')?.startsWith('#'))continue;
  const url=new URL(anchor.href,location.href);
  if(url.origin!==location.origin)continue;
  if(anchor.matches('.brand,.footer-brand')){anchor.href='/';continue;}
  if(!/^\/(work|notes|tutorials|about|search)(\/|$)/.test(url.pathname))continue;
  if(['garden','blue-hour'].includes(url.searchParams.get('theme')||''))url.searchParams.delete('theme');
  anchor.href=url.pathname+url.search+url.hash;
}
