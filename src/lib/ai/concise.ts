// Preserve the full reasoning behind Go deeper rather than discarding it.
export function concise(text:string,request:string,deeper?:string): {text:string;deeper?:string} {
 if(/\b(explain further|show me why|compare|in detail|detailed|go deeper|step by step)\b/i.test(request))return {text,deeper};
 const sentences=text.trim().split(/(?<=[.!?])\s+/);
 if(sentences.length<=3)return {text,deeper};
 return {text:sentences.slice(0,3).join(' ').trim(),deeper:[text,deeper].filter(Boolean).join('\n\n')};
}
