$(function(){

    $.alert = function(level, message){
        let alert_area = $('#alert-area');
        // generate html tag
        alert_area.html('<div class="alert alert-'+level+'" role="alert">'+message+'</div>');
        alert_area.fadeIn().delay(5000).fadeOut();

    };

    $('#auth').click(async () => {
        let flag = $('#flag').val();
        $.post('/auth', {flag: flag}, async (res) => {
            switch (res.status) {
                case 'solved':
                    $.alert('success', `<b>Congratulations!</b> You solved the <b><i>${res.challenge.title}</i></b> challenge, and you got a ${res.challenge.point}pt.`);
                    break;
                case 'already solved':
                    $.alert('info', `<b>Correct!</b> You already solved the <b><i>${res.challenge.title}</i></b> challenge.`);
                    break;
                case 'invalid_flag':
                    $.alert('danger', `<b>Incorrect!</b> You have entered an invalid flag, please make sure you have entered it correctly.`);
            }
            $('#flag').val('');

        });
    });

});