$("#addfile").click(function() {
    var inputfile = "<input type='file' class='form-control' name='file[]'>";
    $("#files").append(inputfile);
});