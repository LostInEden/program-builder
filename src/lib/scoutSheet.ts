/** Preserve every column, including blank/duplicate headings, before field mapping. */
export type ScoutSheet={name:string;headers:string[];rows:Record<string,string>[]};
export function sheetFromRows(name:string,matrix:string[][]):ScoutSheet {
 const first=matrix.findIndex(row=>row.some(v=>v.trim()));
 if(first<0)throw new Error('This sheet is empty.');
 const data=matrix.slice(first);const width=Math.max(...data.map(row=>row.length));
 if(width>500||data.length>20001)throw new Error('Use a sheet with up to 20,000 rows and 500 columns.');
 const used=new Set<string>();
 const headers=Array.from({length:width},(_,i)=>{const base=data[0][i]?.trim()||`Column ${i+1}`;let header=base,n=2;while(used.has(header)){header=`${base} (${n++})`;}used.add(header);return header;});
 const rows=data.slice(1).filter(row=>row.some(v=>v.trim())).map(row=>Object.fromEntries(headers.map((header,i)=>[header,row[i]??''])));
 return {name,headers,rows};
}
export function spreadsheetCell(value:unknown):string {
 if(value==null)return '';
 if(value instanceof Date)return value.toISOString();
 if(typeof value!=='object')return String(value);
 const cell=value as {result?:unknown;formula?:string;sharedFormula?:string;text?:string;hyperlink?:string;richText?:{text:string}[];error?:string};
 if(cell.richText)return cell.richText.map(x=>x.text).join('');
 if(cell.formula||cell.sharedFormula)return cell.result!=null?spreadsheetCell(cell.result):`=${cell.formula??cell.sharedFormula}`;
 if(cell.hyperlink)return cell.text?`${cell.text} (${cell.hyperlink})`:cell.hyperlink;
 return cell.text??cell.error??'';
}
export async function readScoutWorkbook(data:ArrayBuffer):Promise<ScoutSheet[]> {
 const {Workbook}=await import('exceljs');
 const workbook=new Workbook();await workbook.xlsx.load(data);
 const sheets:ScoutSheet[]=[];
 for(const sheet of workbook.worksheets){
  if(sheet.rowCount>20001||sheet.columnCount>500)throw new Error(`Sheet ${sheet.name} is too large. Use up to 20,000 rows and 500 columns.`);
  const matrix:string[][]=[];
  sheet.eachRow({includeEmpty:true},row=>{const values:string[]=[];for(let i=1;i<=sheet.columnCount;i++)values.push(spreadsheetCell(row.getCell(i).value));matrix.push(values);});
  if(matrix.some(row=>row.some(v=>v.trim())))sheets.push(sheetFromRows(sheet.name,matrix));
 }
 if(!sheets.length)throw new Error('No readable sheets found in this workbook.');
 return sheets;
}
