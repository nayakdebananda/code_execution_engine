compiler=$1
filename=$2
inputfile=$3
outputfile=${filename%.*}

if [ "$compiler" = "g++" ]
then
    if   $(g++ -o $outputfile $filename)
    then
        ./$outputfile < $inputfile
    fi
exit
elif [ "$compiler" = "javac" ]
then
    if $(javac $filename) 
    then
        java Main < $inputfile
    fi
    exit
fi

timeout 10 $compiler $filename < $inputfile