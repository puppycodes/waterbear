// Size Routines

/**
 * Convert size parameter to pixel value 
 * 
 * @param {?number=} x is the size parameter
 * @param {?unit=} unit is px or %
 * @param {?boolean=} isWidth is true for width, false for height
 * @return {number} pixel value for size
 *
 * Notes: -em and pt irrelevant for these purposes, need way to disable these
 *         options in the dropdown
 */
function convertSidelengthUnits(x, unit, isWidth) {
  switch(unit) {
    case "px":
      //alert("px")
      return x;
    case "em":
      //alert("em");
      return x;
    case "pt":
      //alert("pt");
      return x;
    case "%":
      if(isWidth){
        //alert((global.stage_width*x)/100);
        //alert(isWidth);
        return (global.stage_width*x)/100;
      }
      else {
        //alert((global.stage_height*x)/100);
        //alert(isWidth);
        return (global.stage_height*x)/100;
      }
    default: //i.e. if no units are specified. May be same as "px", need to confirm
      //alert("default");
      return x; 
  }
}