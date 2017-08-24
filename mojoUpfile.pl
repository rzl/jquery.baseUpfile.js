use Mojolicious::Lite;
use Data::Dumper;
use Mojo::Util qw(md5_sum);
use Mojo::JSON qw(decode_json encode_json);

# /foo?user=sri
post 'uploadFile' => sub {
    my $c        = shift;
    my $file     = $c->param('file');
    my $fileName = $c->param('fileName');
    my $tmpPath  = md5_sum( $c->param('fileName') );
    -e $tmpPath || mkdir($tmpPath);
    $file->move_to( $tmpPath . '/' . $c->param('blockIndex') );
    if ( $c->param('blockCount') ) {
        open( FH, ">$fileName" ) or die "can not open file";
        my $i = 0;
        for ( $i = 0 ; $i <= $c->param('blockCount') - 1 ; $i++ ) {
            open FILE, "$tmpPath/$i" or die $!;
            {
                local $/ = undef;
                print FH <FILE>;
                close FILE;
            }
        }
        close(FH);
        $c->render( json => { state => 'true', info => 'all done' } );
    }
    else {
        $c->render( json => { state => 'true' } );
    }
};

app->start;
