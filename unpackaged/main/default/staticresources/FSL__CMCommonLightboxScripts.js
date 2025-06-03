//W-15630542 extract url to open related list in console app
function extractUrlIfScrUpMatch(url) {
    var decodeUrl = decodeURIComponent(url);
    var pattern = /javascript:srcUp\('([^']+)'\);/;
    var isMatch = decodeUrl.match(pattern);
    if (isMatch)  {
        return isMatch[1];
    }
    return null;
}