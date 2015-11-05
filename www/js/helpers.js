

Date.prototype.addDays = function(d) {    
   this.setTime(this.getTime() + (d*24*60*60*1000)); 
   return this;   
}
Date.prototype.addHours = function(h) {    
   this.setTime(this.getTime() + (h*60*60*1000)); 
   return this;   
}
Date.prototype.addMinutes = function(m) {    
   this.setTime(this.getTime() + (m*60*1000)); 
   return this;   
}
