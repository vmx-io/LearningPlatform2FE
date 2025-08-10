import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { NgModule } from '@angular/core';
@NgModule({
  imports: [BrowserModule, AppRoutingModule, HttpClientModule],
})
export class AppModule {}
