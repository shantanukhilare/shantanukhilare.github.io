[HttpPost("UploadDocument")]
[Authorize(Policy = "AnyAuthenticatedUser")]
[TypeFilter(typeof(PageLevelSecurityFilter), Arguments = new object[] { "Edit", "F0BE186E-02A8-4BD4-A716-AD5CECDF69F1" })]
public async Task<IActionResult> UploadAllFile([FromForm] UploadFileModel uploadfile)
{
    if (!ModelState.IsValid)
    {
        return BadRequest("400, Invalid request");
    }

    if (uploadfile.Files == null || !uploadfile.Files.Any())
    {
        return BadRequest("No files were provided for upload.");
    }

    // 1. The Rules: Allowed Extensions and MIME Types
    var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase) 
    { 
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", 
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp" 
    };

    var allowedMimeTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) 
    { 
        "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"
    };

    const long maxFileSize = 5 * 1024 * 1024; // 5 MB limit

    // 2. The Enforcement: Checking each file against the rules
    foreach (var file in uploadfile.Files)
    {
        // Check size limits
        if (file.Length == 0 || file.Length > maxFileSize)
        {
            return BadRequest($"File size for '{file.FileName}' is invalid or exceeds the {maxFileSize / (1024 * 1024)}MB limit.");
        }

        // Sanitize the filename to prevent directory traversal
        var sanitizedFileName = Path.GetFileName(file.FileName); 
        if (string.IsNullOrWhiteSpace(sanitizedFileName) || 
            sanitizedFileName.Contains("..") || 
            sanitizedFileName.Contains('\0'))
        {
            return BadRequest("Invalid characters detected in filename.");
        }

        // Block double extensions (e.g., image.php.png)
        if (sanitizedFileName.Count(c => c == '.') > 1)
        {
             return BadRequest("Files with multiple extensions are not allowed.");
        }

        // Enforce the extension whitelist
        var extension = Path.GetExtension(sanitizedFileName);
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
        {
            return BadRequest($"The file extension '{extension}' is not permitted.");
        }

        // Enforce the MIME type whitelist
        if (!allowedMimeTypes.Contains(file.ContentType))
        {
            return BadRequest($"The file type '{file.ContentType}' is not permitted.");
        }
    }

    // 3. The Execution: All checks passed, process the file
    var result = await _fileUploadService.UploadAllFile(uploadfile);
    if (result == null)
    {
        return BadRequest();
    }
    
    return Ok("Files Uploaded.");
}