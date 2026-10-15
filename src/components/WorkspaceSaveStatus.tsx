"use client";
import {useSaveStatus} from '@/lib/saveStatus';
export default function WorkspaceSaveStatus(){const status=useSaveStatus(s=>s.status);return <p role="status" className={`no-print text-xs mt-2 ${status==='error'?'text-red-700':'text-dim'}`}>{status==='error'?'Could not save to this browser. Keep this page open and free browser storage before continuing.':status==='saving'?'Saving…':status==='saved'?'Saved in this browser.':'Changes save in this browser.'}</p>;}
