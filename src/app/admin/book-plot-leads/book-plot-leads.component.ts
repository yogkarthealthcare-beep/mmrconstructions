import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({selector:'app-book-plot-leads',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./book-plot-leads.component.html',styleUrls:['./book-plot-leads.component.css']})
export class BookPlotLeadsComponent implements OnInit {
  rows:any[]=[]; loading=false; search=''; status=''; page=1; limit=20; total=0; pages=1; statuses=['New','Contacted','Follow Up','Converted','Closed'];
  constructor(private api:ApiService,private http:HttpClient){}
  ngOnInit(){this.load();}
  load(){this.loading=true;this.api.adminGetBookPlotLeads({page:this.page,limit:this.limit,search:this.search,status:this.status}).subscribe({next:(r:any)=>{this.rows=r.data?.items||[];this.total=r.data?.pagination?.total||0;this.pages=r.data?.pagination?.pages||1;this.loading=false;},error:()=>this.loading=false});}
  filter(){this.page=1;this.load();}
  go(delta:number){this.page=Math.min(this.pages,Math.max(1,this.page+delta));this.load();}
  update(row:any){this.api.adminUpdateBookPlotLeadStatus(row.id,row.status).subscribe();}
  export(){const url=this.api.adminBookPlotLeadsExportUrl({search:this.search,status:this.status});const token=localStorage.getItem('mmr_admin_token')||'';this.http.get(url,{responseType:'blob',headers:new HttpHeaders({Authorization:`Bearer ${token}`})}).subscribe(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`book-plot-leads-${new Date().toISOString().slice(0,10)}.xlsx`;a.click();URL.revokeObjectURL(a.href);});}
}
