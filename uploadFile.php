<?php  
$fileName=$_POST['fileName'];  
$tmp_dir="uploads/".md5($fileName);  
file_exists($tmp_dir) or mkdir($tmp_dir,0777,true);  
$path=$tmp_dir."/".$_POST['blockIndex'];  
move_uploaded_file($_FILES["file"]["tmp_name"],$path);  
if(isset($_POST['blockCount'])){  
    $count=$_POST['blockCount'];  
	$fileName=iconv("UTF-8","gb2312", $_POST['fileName']);
    $fp   = fopen($fileName,"wb");  
    for($i=0;$i<=$count-1;$i++){  
        $handle = fopen($tmp_dir."/".$i,"rb");    
        fwrite($fp,fread($handle,filesize($tmp_dir."/".$i)));    
        fclose($handle);      
    }  
    fclose($fp);  
	echo json_encode(array("state"=>true,"info"=>'all done'));
}else{
	echo json_encode(array("state"=>true));
}  
?>  