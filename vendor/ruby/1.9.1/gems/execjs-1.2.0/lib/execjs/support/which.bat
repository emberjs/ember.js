@rem Taken from http://blogs.msdn.com/b/oldnewthing/archive/2005/01/20/357225.aspx
@for %%e in (%PATHEXT%) do @for %%i in (%1%%e) do @if NOT "%%~$PATH:i"=="" @echo %%~$PATH:i
