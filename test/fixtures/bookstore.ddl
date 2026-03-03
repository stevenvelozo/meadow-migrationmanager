!Book
@IDBook
$Title 200
$Type 32
$Genre 128
$ISBN 64
$Language 12
$ImageURL 254
#PublicationYear

!Author
@IDAuthor
$Name 200

!BookAuthorJoin
@IDBookAuthorJoin
~IDBook -> IDBook
~IDAuthor -> IDAuthor

!BookPrice
@IDBookPrice
.Price 8,2
&StartDate
&EndDate
%Discountable
$CouponCode 16
~IDBook -> IDBook

!Review
@IDReview
*Text
#Rating
~IDBook -> IDBook
