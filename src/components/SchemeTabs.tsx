import Link from "next/link";
export default function SchemeTabs({active='overview'}:{active?:'overview'|'library'|'analysis'|'art'}){
 return active==='overview'?null:<Link href="/scheme" className="mb-4 inline-block text-sm font-semibold text-grass">← My Scheme</Link>;
}
