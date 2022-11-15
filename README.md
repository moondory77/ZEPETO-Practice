# ZEPETO-Practice
 제페토 월드제작 연습 
 
오브젝트 동기화
- Sync Transform
- Sync Tween   

   
- InterpolationDOTween - 서버 Request, Response 시간 보간 
![image](https://user-images.githubusercontent.com/82865325/201308050-03aed1f3-ff86-4e36-b71d-6dd93f0b0ad7.png)
![image](https://user-images.githubusercontent.com/82865325/201307844-4057e20e-7ed8-4b99-a246-6bb107db45ed.png)   
## 결과 (노란색 - 받아온 포지션, 파란색 - 보간된 위치)   
1. 일반적인 상황 (서버 지연 < 100ms)   
![ezgif com-gif-maker (8)](https://user-images.githubusercontent.com/82865325/201810307-d07452a3-47c1-4ede-b6d2-6282214c7222.gif)
2. 네트워크가 1초간 지연 된 상황을 가정 (response → setTimeout(1000))   
![ezgif com-gif-maker (7)](https://user-images.githubusercontent.com/82865325/201810299-80c1ce8d-2779-40fc-b971-5c020b776201.gif)   
보간 된 위치가 에디터 클라이언트와 동일하게 움직이는것을 확인할 수 있다.
