"use client";

import React, { useState } from "react";
import { Image as ImageIcon, UploadCloud, Grid2x2, List, Search, Filter, PlusCircle, Trash2, ExternalLink, Download } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

// Mock media data
const mockMedia = [
  {
    id: 1,
    name: "product-launch.jpg",
    type: "image",
    format: "jpg",
    url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    uploadedAt: new Date(2025, 3, 15),
    size: "1.2 MB",
    dimensions: "1200 x 800",
    usedIn: 2,
    tags: ["product", "marketing"]
  },
  {
    id: 2,
    name: "team-photo.jpg",
    type: "image",
    format: "jpg",
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    uploadedAt: new Date(2025, 3, 10),
    size: "2.4 MB",
    dimensions: "1600 x 1200",
    usedIn: 1,
    tags: ["team", "company"]
  },
  {
    id: 3,
    name: "office-setup.jpg",
    type: "image",
    format: "jpg",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174",
    uploadedAt: new Date(2025, 3, 5),
    size: "1.8 MB",
    dimensions: "1920 x 1080",
    usedIn: 0,
    tags: ["office", "workspace"]
  },
  {
    id: 4,
    name: "conference.jpg",
    type: "image",
    format: "jpg",
    url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678",
    uploadedAt: new Date(2025, 2, 28),
    size: "3.1 MB",
    dimensions: "2000 x 1333",
    usedIn: 1,
    tags: ["event", "conference"]
  },
];

const Media = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  
  // Get media based on filters
  const filteredMedia = mockMedia.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesFilter = filter === "all" || 
      (filter === "unused" && item.usedIn === 0) ||
      (filter === "used" && item.usedIn > 0);
    
    return matchesSearch && matchesFilter;
  });
  
  // Get selected media item
  const selectedItem = selectedMedia !== null 
    ? mockMedia.find(item => item.id === selectedMedia) 
    : null;
  
  return (
    <Card className="min-h-[80vh]">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-primary" />
              Media Library
            </span>
          </CardTitle>
          <Button>
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
        
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Input
              placeholder="Search media..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Media</SelectItem>
                <SelectItem value="used">Used in Posts</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="border rounded flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "grid" ? "bg-accent" : ""} 
                onClick={() => setViewMode("grid")}
              >
                <Grid2x2 size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "list" ? "bg-accent" : ""} 
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-3">
          <Tabs defaultValue="images">
            <TabsList>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex">
        {filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] p-8 flex-1">
            <div className="mb-6 flex flex-col items-center gap-2">
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <span className="text-lg font-medium">Tidak ditemukan media</span>
              <p className="text-muted-foreground text-center text-sm">
                Coba kurangi filter atau upload media baru
              </p>
            </div>
            <Button>
              Upload Media
            </Button>
          </div>
        ) : (
          <>
            {/* Media Grid/List */}
            <div className={`${selectedMedia ? 'w-2/3' : 'w-full'} min-h-[500px] p-4 overflow-y-auto`}>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredMedia.map((media) => (
                    <div 
                      key={media.id} 
                      className={`group relative cursor-pointer rounded-md overflow-hidden border ${selectedMedia === media.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedMedia(media.id)}
                    >
                      <div className="aspect-square">
                        <img 
                          src={media.url} 
                          alt={media.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="outline" size="icon" className="bg-white/80 hover:bg-white">
                          <PlusCircle size={18} />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                        <div className="text-sm truncate">{media.name}</div>
                        <div className="text-xs opacity-80 flex justify-between">
                          <span>{format(media.uploadedAt, "MMM d, yyyy")}</span>
                          <span>{media.size}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 text-xs font-medium">Preview</th>
                        <th className="text-left p-2 text-xs font-medium">Name</th>
                        <th className="text-left p-2 text-xs font-medium">Date</th>
                        <th className="text-left p-2 text-xs font-medium">Size</th>
                        <th className="text-left p-2 text-xs font-medium">Used In</th>
                        <th className="text-left p-2 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedia.map((media) => (
                        <tr 
                          key={media.id}
                          className={`border-b hover:bg-muted/50 cursor-pointer ${selectedMedia === media.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedMedia(media.id)}
                        >
                          <td className="p-2">
                            <div className="w-12 h-12 rounded overflow-hidden">
                              <img 
                                src={media.url} 
                                alt={media.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-sm">{media.name}</div>
                            <div className="text-xs text-muted-foreground">{media.dimensions}</div>
                          </td>
                          <td className="p-2 text-sm">
                            {format(media.uploadedAt, "MMM d, yyyy")}
                          </td>
                          <td className="p-2 text-sm">
                            {media.size}
                          </td>
                          <td className="p-2 text-sm">
                            {media.usedIn} posts
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Download size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Media Details Panel - Hootsuite Style */}
            {selectedItem && selectedMedia && (
              <div className="w-1/3 border-l min-h-[500px]">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Media Details</h3>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedMedia(null)}>
                      <List size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="aspect-square rounded overflow-hidden mb-4 border">
                    <img 
                      src={selectedItem.url} 
                      alt={selectedItem.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">{selectedItem.name}</h4>
                      <div className="text-xs text-muted-foreground mt-1">
                        Uploaded on {format(selectedItem.uploadedAt, "MMMM d, yyyy")}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Type</div>
                        <div>{selectedItem.format.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Size</div>
                        <div>{selectedItem.size}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Dimensions</div>
                        <div>{selectedItem.dimensions}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Used in</div>
                        <div>{selectedItem.usedIn} posts</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Tags</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-accent text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full">
                          <PlusCircle size={12} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download size={14} className="mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <ExternalLink size={14} className="mr-2" />
                        Copy URL
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start text-destructive">
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Media;