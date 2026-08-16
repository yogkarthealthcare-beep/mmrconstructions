import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector:'app-home-page-settings', standalone:true, imports:[CommonModule,FormsModule], templateUrl:'./home-page-settings.component.html', styleUrls:['./home-page-settings.component.css'] })
export class HomePageSettingsComponent implements OnInit {
  settings = { display_type: 'hero_slider', show_information_section: true };
  saving=false; message='';
  constructor(private api:ApiService){}
  ngOnInit(){ this.load(); }
  load(){
    this.api.adminGetHomePageSettings().subscribe((r:any)=>this.settings={...this.settings,...r.data});
  }
  save(){ this.saving=true; this.message=''; this.api.adminUpdateHomePageSettings(this.settings).subscribe({next:()=>{this.message='Home page settings saved.';this.saving=false;},error:(e:any)=>{this.message=e?.error?.message||'Unable to save settings.';this.saving=false;}}); }
}
