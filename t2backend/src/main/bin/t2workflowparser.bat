java -Dplatform.home=%~dp0platform -cp ${artifactId}-code.jar;${artifactId}-dependencies.jar;conf ${app.parserClass} %*
